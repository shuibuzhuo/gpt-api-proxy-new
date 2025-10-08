const OpenAI = require("openai");
const Router = require("koa-router");
require("dotenv").config();

const router = new Router();

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.OPENAI_API_KEY,
});

router.get("/api/gpt/chat", async (ctx, next) => {
  ctx.status = 200;
  ctx.set("Content-Type", "text/event-stream"); // 'text/event-stream' 标识 SSE 即 Server-Sent Events

  let gptStream;

  ctx.req.on("close", () => {
    console.log("req close...");

    // 取消请求
    console.log("try abort...");
    if (!ctx.gptStreamDone) {
      console.log("abort request...");
      if (gptStream) gptStream.controller.abort();
      console.log("abort ok...");
    }
  });

  const query = ctx.query || {};

  // 简单的密钥
  const authToken = query["x-auth-token"] || "";
  if (!authToken.trim() || authToken !== process.env.AUTH_TOKEN) {
    const errMsg = "invalid token";
    ctx.res.write(`data: [ERROR]${errMsg}\n\n`); // 格式必须是 `data: xxx\n\n` ！！！
    return;
  }

  // option
  const optionStr = query["option"] || "{}";
  const decodeOptionStr = decodeURIComponent(optionStr);
  const option = JSON.parse(decodeOptionStr);

  if (!option.messages) {
    const errMsg = "invalid option: messages required";
    ctx.res.write(`data: [ERROR]${errMsg}\n\n`); // 格式必须是 `data: xxx\n\n` ！！！
    return;
  }

  try {
    // request GPT API
    gptStream = await openai.chat.completions.create({
      model: "deepseek-chat",
      max_tokens: 1000, // 默认
      stream: true, // stream
      stream_options: {
        include_usage: true,
      },
      ...option,
    });
  } catch (error) {
    const errMsg = error.message || "request openai API error";
    ctx.res.write(`data: [ERROR]${errMsg}\n\n`); // 格式必须是 `data: xxx\n\n` ！！！
    return;
  }

  if (gptStream == null) {
    const errMsg = "gptStream is not defined";
    ctx.res.write(`data: [ERROR]${errMsg}\n\n`); // 格式必须是 `data: xxx\n\n` ！！！
    return;
  }

  for await (const chunk of gptStream) {
    const { choices = [], usage } = chunk;

    if (choices.length > 0) {
      const content = choices[0].delta.content;
      if (content) {
        const data = { c: content };
        ctx.res.write(`data: ${JSON.stringify(data)}\n\n`); // 格式必须是 `data: xxx\n\n` ！！！
      } else if (usage != null) {
        console.log("content is null, usage...", usage); // 格式如 { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
        ctx.res.write(`data: ${JSON.stringify({ usage })}\n\n`); // 格式必须是 `data: xxx\n\n` ！！！
        ctx.gptStreamDone = true;
        ctx.res.write(`data: [DONE]\n\n`);
      }
    }
  }
});

module.exports = router;
