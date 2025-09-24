const OpenAI = require("openai");
const Router = require("koa-router");
require("dotenv").config();

const router = new Router();

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.OPENAI_API_KEY,
});

router.get("/api/gpt/chat", async (ctx, next) => {
  const query = ctx.query || {};

  // 简单的密钥
  const authToken = query["x-auth-token"] || "";
  if (!authToken.trim() || authToken !== process.env.AUTH_TOKEN) {
    ctx.body = "invalid token";
    return;
  }

  // option
  const optionStr = query["option"] || "{}";
  const decodeOptionStr = decodeURIComponent(optionStr);
  const option = JSON.parse(decodeOptionStr);

  if (!option.messages) {
    ctx.body = "invalid option: messages required";
    return;
  }

  // request GPT API
  const gptStream = await openai.chat.completions.create({
    model: "deepseek-chat",
    // messages: [{ role: 'user', content: 'xxx' }],
    // max_tokens: 100,
    stream: true, // stream
    ...option,
  });

  ctx.status = 200;
  ctx.set("Content-Type", "text/event-stream"); // 'text/event-stream' 标识 SSE 即 Server-Sent Events

  for await (const chunk of gptStream) {
    console.log(
      "chunk.choices[0].delta.content....",
      chunk.choices[0].delta.content,
      "choices...",
      choices
    );
    ctx.res.write(`data: ${JSON.stringify(chunk)}\n\n`); // 格式必须是 `data: xxx\n\n` ！！！
    if (chunk.choices[0].delta.content == null) {
      console.log("chunk.choices[0].delta.content is null");
      ctx.res.end(`data: [DONE]`);
      break;
    }
  }

  ctx.req.on("close", () => {
    console.log("req close...");
  });
});

module.exports = router;
