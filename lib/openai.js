const OpenAI = require("openai");

// instance1 - deepSeek
const apiKey1 = process.env.DEEP_SEEK_API_KEY;
const instance1 = {
  openai: new OpenAI({ apiKey: apiKey1, baseURL: "https://api.deepseek.com" }),
  model: "deepseek-chat",
  key: apiKey1,
};

const instanceList = [instance1];
let index = 0;

function getOpenAIInstance() {
  const instance = instanceList[index];
  index = (index + 1) % instanceList.length;
  return instance;
}

module.exports = { getOpenAIInstance };
