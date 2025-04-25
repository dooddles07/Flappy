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

const GRAVITY = 2;
const JUMP_FORCE = -20;
const PIPE_WIDTH = 50;
const PIPE_GAP = 300;
const PIPE_SPEED = 5;

const BIRD_FRAME_WIDTH = 50; // Width of one bird frame
const BIRD_FRAME_HEIGHT = 64;
const GROUND_WIDTH = SCREEN_WIDTH * 2;

export default function App() {
  const [birdY, setBirdY] = useState(SCREEN_HEIGHT / 2);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState([{ x: SCREEN_WIDTH, height: Math.random() * (SCREEN_HEIGHT - PIPE_GAP), passed: false }]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [birdFrame, setBirdFrame] = useState(0);

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

  // Bird animation logic
  useEffect(() => {
    const birdAnimation = setInterval(() => {
      setBirdFrame((prevFrame) => (prevFrame + 1) % 3); // Cycle through 3 frames (0, 1, 2)
    }, 100); // Adjust the interval for desired animation speed (100ms)

    return () => clearInterval(birdAnimation); // Cleanup on unmount
  }, []);

  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      setVelocity((prev) => prev + GRAVITY);
      setBirdY((prev) => prev + velocity);

      setPipes((prev) => {
        const updatedPipes = prev
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
          updatedPipes.length > 0 &&
          updatedPipes[updatedPipes.length - 1].x < SCREEN_WIDTH / 2
        ) {
          const newHeight = Math.random() * (SCREEN_HEIGHT - PIPE_GAP);
          updatedPipes.push({ x: SCREEN_WIDTH, height: newHeight, passed: false });
        }

        return updatedPipes;
      });

      const birdHitsPipe = pipes.some((pipe) => {
        const birdLeft = SCREEN_WIDTH / 2 - BIRD_FRAME_WIDTH / 2;
        const birdRight = SCREEN_WIDTH / 2 + BIRD_FRAME_WIDTH / 2;
        const birdTop = birdY;
        const birdBottom = birdY + BIRD_FRAME_HEIGHT;

        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + PIPE_WIDTH;
        const pipeTop = pipe.height;
        const pipeBottom = pipe.height + PIPE_GAP;

        const hitsTopPipe = birdRight > pipeLeft && birdLeft < pipeRight && birdTop < pipeTop;
        const hitsBottomPipe = birdRight > pipeLeft && birdLeft < pipeRight && birdBottom > pipeBottom;

        return hitsTopPipe || hitsBottomPipe;
      });

      if (birdY >= SCREEN_HEIGHT - 80 - BIRD_FRAME_HEIGHT || birdHitsPipe) setGameOver(true);
    }, 16);

    return () => clearInterval(gameLoop);
  }, [birdY, pipes, gameOver]);

  useEffect(() => {
    // Retrieve high score from AsyncStorage when the app loads
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
    if (gameOver) {
      // Update high score if the current score is higher
      if (score > highScore) {
        setHighScore(score);
        saveHighScore(score);
      }
    }
  }, [gameOver]);

  const jump = () => {
    if (!gameOver) {
      setVelocity(JUMP_FORCE);
    } else {
      setGameOver(false);
      setBirdY(SCREEN_HEIGHT / 2);
      setVelocity(0);
      setPipes([{
        x: SCREEN_WIDTH, height: Math.random() * (SCREEN_HEIGHT - PIPE_GAP),
        passed: false
      }]);
      setScore(0);
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
          {/* 🎯 Current Score */}
          <Text style={styles.score}>{score}</Text>

          {/* 🐦 Flapping Bird */}
          <View style={[styles.birdContainer, { top: birdY }]}>
            <Image
              source={require("../assets/images/bird.png")}
              style={[styles.bird, { transform: [{ translateX: -birdFrame * BIRD_FRAME_WIDTH }] }]}
              resizeMode="contain"
            />
          </View>

          {/* 🧱 Pipes */}
          {pipes.map((pipe, index) => (
            <React.Fragment key={index}>
              <Image
                source={require("../assets/images/pipe.png")}
                style={[
                  styles.pipe,
                  {
                    left: pipe.x,
                    width: PIPE_WIDTH,
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
                    width: PIPE_WIDTH,
                    height: SCREEN_HEIGHT - pipe.height - PIPE_GAP - 80,
                    top: pipe.height + PIPE_GAP,
                  },
                ]}
                resizeMode="stretch"
              />
            </React.Fragment>
          ))}

          {/* 💀 Game Over */}
          {gameOver && (
            <View style={styles.gameOverContainer}>
              {/* GAME OVER Text */}
              <Text style={styles.gameOverText}>GAME OVER</Text>

              {/* Restart Button */}
              <TouchableWithoutFeedback onPress={jump}>
                <View style={styles.restartButton}>
                  <Text style={styles.restartButtonText}>RESTART GAME</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* High Scores Button */}
              <TouchableWithoutFeedback
                onPress={() =>
                  alert(`High Score: ${highScore}`) // Display high score in an alert
                }
              >
                <View style={styles.highScoresButton}>
                  <Text style={styles.highScoresButtonText}>VIEW HIGH SCORES</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          )}

          {/* 🟫 Scrolling Ground */}
          <Animated.Image
            source={require("../assets/images/ground.png")}
            style={[styles.ground, animatedGroundStyle]}
            resizeMode="stretch"
          />
          <Animated.Image
            source={require("../assets/images/ground.png")}
            style={[styles.ground, { left: SCREEN_WIDTH }, animatedGroundStyle]}
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
    backgroundColor: "#87CEEB", // Sky blue background
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
  },
  birdContainer: {
    position: "absolute",
    width: BIRD_FRAME_WIDTH,
    height: BIRD_FRAME_HEIGHT,
    overflow: "hidden",
  },
  bird: {
    width: BIRD_FRAME_WIDTH * 3, // Total width of the sprite sheet (3 frames)
    height: BIRD_FRAME_HEIGHT,
  },
  pipe: {
    position: "absolute",
    width: PIPE_WIDTH,
  },
  gameOverContainer: {
    position: "absolute",
    top: SCREEN_HEIGHT / 2 - 100,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  gameOverText: {
    fontSize: 50,
    fontWeight: "bold",
    color: "red",
    textAlign: "center",
    marginBottom: 20,
    textShadowColor: "black",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  restartButton: {
    backgroundColor: "#4CAF50", // Green button
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
    textAlign: "center",
  },
  highScoresButton: {
    backgroundColor: "#2196F3", // Blue button
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
    fontWeight: "normal",
    color: "white",
    textAlign: "center",
  },
  ground: {
    position: "absolute",
    bottom: 0,
    width: SCREEN_WIDTH,
    height: 80,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  modalScore: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#4CAF50", // Green for high score
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: "#2196F3", // Blue button
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
});