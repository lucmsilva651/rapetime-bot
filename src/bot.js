require("@dotenvx/dotenvx").config({ path: ".env" });
const { Telegraf } = require("telegraf");
const cron = require("node-cron");
const fs = require("node:fs");

// Ensures bot token is set, and not default value
if (!process.env.botToken || process.env.botToken === "InsertYourBotTokenHere") {
  console.error("Bot token is not set. Please set the bot token in the .env file.")
  process.exit(1)
}

const bot = new Telegraf(process.env.botToken);
const maxRetries = process.env.maxRetries || 5;
let restartCount = 0;

setInterval(() => {
  const channelId = process.env.channelId;
  const ownerId = process.env.ownerId;

  bot.telegram.getChat(channelId).then(async (chat) => {
    await bot.telegram.sendAnimation(channelId, {
      source: fs.createReadStream("./src/anim.mp4")
    }).catch((error) => {
      bot.telegram.sendMessage(ownerId, `Failed to send photo to ${chat.title} (${chat.username}, ${channelId}): ${error.message}`);
    });
  });
}, 10 * 1000);

const startBot = async () => {
  const botInfo = await bot.telegram.getMe();
  const restartWait = process.env.restartWait || 5000;
  console.log(`${botInfo.first_name} is running...`);
  try {
    await bot.launch();
    restartCount = 0;
  } catch (error) {
    console.error("Failed to start bot:", error.message);
    if (restartCount < Number(maxRetries)) {
      console.log(`Waiting ${restartWait}ms before retrying...`);
      await new Promise(r => setTimeout(r, restartWait));
      restartCount++;
      console.log(`Retrying to start bot... Attempt ${restartCount}`);
      setTimeout(startBot, 5000);
    } else {
      console.error("Maximum retry attempts reached. Exiting.");
      process.exit(1);
    }
  }
};

const handleShutdown = (signal) => {
  console.log(`Received ${signal}. Stopping bot...`);
  bot.stop(signal);
  process.exit(0);
};

process.once("SIGINT", () => handleShutdown("SIGINT"));
process.once("SIGTERM", () => handleShutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error.message);
  console.error(error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

startBot()