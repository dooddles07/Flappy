import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableWithoutFeedback,
  Dimensions,
  StyleSheet,
  ImageBackground,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SCREEN_WIDTH = Dimensions.get("screen").width;
const SCREEN_HEIGHT = Dimensions.get("screen").height;

const GRAVITY = 1.5;
const JUMP_FORCE = -15;
const PIPE_WIDTH = 50;
const PIPE_GAP = 300;
const PIPE_SPEED = 5;
const PIPE_SPACING = SCREEN_WIDTH / 1.5;

const BIRD_FRAME_WIDTH = 50;
const BIRD_FRAME_HEIGHT = 64;

export default function App() {
  const [birdY, setBirdY] = useState(SCREEN_HEIGHT / 2);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [birdFrame, setBirdFrame] = useState(0);
  const [started, setStarted] = useState(false);

  const groundX = useSharedValue(0);

  useEffect(() => {
    groundX.value = withRepeat(
      withTiming(-SCREEN_WIDTH, { duration: 2000 }),
      -1,
      false
    );
  }, []);

  const animatedGroundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: groundX.value }],
  }));

  useEffect(() => {
    const birdAnimation = setInterval(() => {
      setBirdFrame((prevFrame) => (prevFrame + 1) % 3);
    }, 100);
    return () => clearInterval(birdAnimation);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;

    const gameLoop = setInterval(() => {
      setVelocity((prev) => prev + GRAVITY);
      setBirdY((prev) => prev + velocity);

      setPipes((prevPipes) => {
        const updatedPipes = prevPipes
          .map((pipe) => {
            const newPipe = { ...pipe, x: pipe.x - PIPE_SPEED };
            if (!pipe.passed && newPipe.x + PIPE_WIDTH < SCREEN_WIDTH / 2) {
              setScore((prevScore) => prevScore + 1);
              newPipe.passed = true;
            }
            return newPipe;
          })
          .filter((pipe) => pipe.x + PIPE_WIDTH > 0);

        if (
          updatedPipes.length === 0 ||
          updatedPipes[updatedPipes.length - 1].x < SCREEN_WIDTH - PIPE_SPACING
        ) {
          updatedPipes.push({
            x: SCREEN_WIDTH,
            height: Math.random() * (SCREEN_HEIGHT - PIPE_GAP - 100),
            passed: false,
          });
        }

        return updatedPipes;
      });

      const birdLeft = SCREEN_WIDTH / 2 - BIRD_FRAME_WIDTH / 2;
      const birdRight = SCREEN_WIDTH / 2 + BIRD_FRAME_WIDTH / 2;
      const birdTop = birdY;
      const birdBottom = birdY + BIRD_FRAME_HEIGHT;

      const birdHitsPipe = pipes.some((pipe) => {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + PIPE_WIDTH;
        const pipeTop = pipe.height;
        const pipeBottom = pipe.height + PIPE_GAP;

        const hitsTopPipe =
          birdRight > pipeLeft &&
          birdLeft < pipeRight &&
          birdTop < pipeTop;
        const hitsBottomPipe =
          birdRight > pipeLeft &&
          birdLeft < pipeRight &&
          birdBottom > pipeBottom;

        return hitsTopPipe || hitsBottomPipe;
      });

      if (birdY >= SCREEN_HEIGHT - 80 - BIRD_FRAME_HEIGHT || birdHitsPipe) {
        setGameOver(true);
        setStarted(false);
      }
    }, 16);

    return () => clearInterval(gameLoop);
  }, [birdY, pipes, velocity, started, gameOver]);

  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const storedHighScore = await AsyncStorage.getItem("highScore");
        if (storedHighScore !== null) {
          setHighScore(parseInt(storedHighScore, 10));
        }
      } catch (error) {
        console.error("Failed to load high score:", error);
      }
    };

    loadHighScore();
  }, []);

  const saveHighScore = async (newHighScore: number) => {
    try {
      await AsyncStorage.setItem("highScore", newHighScore.toString());
    } catch (error) {
      console.error("Failed to save high score:", error);
    }
  };

  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      saveHighScore(score);
    }
  }, [gameOver]);

  const startGame = () => {
    setStarted(true);
    setGameOver(false);
    setBirdY(SCREEN_HEIGHT / 2);
    setVelocity(0);
    setScore(0);
    setPipes([
      {
        x: SCREEN_WIDTH,
        height: Math.random() * (SCREEN_HEIGHT - PIPE_GAP - 100),
        passed: false,
      },
    ]);
  };

  const jump = () => {
    if (!started) return;
    if (!gameOver) {
      setVelocity(JUMP_FORCE);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={jump}>
      <ImageBackground
        source={require("../assets/images/background.webp")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.container}>
          <Text style={styles.score}>{started && !gameOver ? score : ""}</Text>

          <View style={[styles.birdContainer, { top: birdY }]}>
            <Image
              source={require("../assets/images/bird.png")}
              style={[
                styles.bird,
                {
                  transform: [{ translateX: -birdFrame * BIRD_FRAME_WIDTH }],
                },
              ]}
              resizeMode="contain"
            />
          </View>

          {pipes.map((pipe, index) => (
            <React.Fragment key={index}>
              <Image
                source={require("../assets/images/pipe.png")}
                style={[
                  styles.pipe,
                  {
                    left: pipe.x,
                    height: pipe.height,
                    top: 0,
                    transform: [{ rotate: "180deg" }],
                  },
                ]}
                resizeMode="stretch"
              />
              <Image
                source={require("../assets/images/pipe.png")}
                style={[
                  styles.pipe,
                  {
                    left: pipe.x,
                    height: SCREEN_HEIGHT - pipe.height - PIPE_GAP - 80,
                    top: pipe.height + PIPE_GAP,
                  },
                ]}
                resizeMode="stretch"
              />
            </React.Fragment>
          ))}

          {!started && !gameOver && (
            <View style={styles.startContainer}>
              <TouchableWithoutFeedback onPress={startGame}>
                <View style={styles.startButton}>
                  <Text style={styles.startButtonText}>START GAME</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          )}

          {gameOver && (
            <View style={styles.gameOverContainer}>
              <Text style={styles.gameOverText}>GAME OVER</Text>

              <TouchableWithoutFeedback onPress={startGame}>
                <View style={styles.restartButton}>
                  <Text style={styles.restartButtonText}>RESTART GAME</Text>
                </View>
              </TouchableWithoutFeedback>

              <TouchableWithoutFeedback
                onPress={() => alert(`High Score: ${highScore}`)}
              >
                <View style={styles.highScoresButton}>
                  <Text style={styles.highScoresButtonText}>
                    VIEW HIGH SCORES
                  </Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          )}

          <Animated.Image
            source={require("../assets/images/ground.png")}
            style={[styles.ground, animatedGroundStyle]}
            resizeMode="stretch"
          />
          <Animated.Image
            source={require("../assets/images/ground.png")}
            style={[
              styles.ground,
              { left: SCREEN_WIDTH },
              animatedGroundStyle,
            ]}
            resizeMode="stretch"
          />

          <StatusBar style="auto" />
        </View>
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "#87CEEB",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  score: {
    position: "absolute",
    top: 50,
    fontSize: 40,
    fontWeight: "bold",
    color: "white",
    textShadowColor: "black",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    zIndex: 10,
    elevation: 10,
  },
  birdContainer: {
    position: "absolute",
    width: BIRD_FRAME_WIDTH,
    height: BIRD_FRAME_HEIGHT,
    overflow: "hidden",
  },
  bird: {
    width: BIRD_FRAME_WIDTH * 3,
    height: BIRD_FRAME_HEIGHT,
  },
  pipe: {
    position: "absolute",
    width: PIPE_WIDTH,
  },
  startContainer: {
    position: "absolute",
    top: SCREEN_HEIGHT / 2 - 50,
    alignItems: "center",
    width: "100%",
  },
  startButton: {
    backgroundColor: "#FF9800",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  startButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  gameOverContainer: {
    position: "absolute",
    top: SCREEN_HEIGHT / 2 - 100,
    alignItems: "center",
    width: "100%",
  },
  gameOverText: {
    fontSize: 50,
    fontWeight: "bold",
    color: "red",
    marginBottom: 20,
    textShadowColor: "black",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  restartButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  restartButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  highScoresButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  highScoresButtonText: {
    fontSize: 18,
    color: "white",
  },
  ground: {
    position: "absolute",
    bottom: 0,
    width: SCREEN_WIDTH,
    height: 80,
  },
});
