import axios from 'axios';
import { HttpsAgent } from 'https-agent';

# // 配置代理服务器
const proxy = {
  host: '127.0.0.1',
  port: 8001,
};

// 创建一个忽略证书错误的 HTTPS 代理
const agent = new HttpsAgent({
  rejectUnauthorized: false, // 忽略证书错误
  proxy: {
    host: proxy.host,
    port: proxy.port,
  },
});

// 要发送的数据
const data = { "hello world": "example" };

// 使用 async/await 发送 POST 请求
const sendRequest = async () => {
  try {
    const response = await axios.post('https://www.example.com', data, {
      httpsAgent: agent, // 使用代理
      headers: {
        'Content-Type': 'application/json', // 设置请求头为 JSON
      },
    });

    // 输出响应数据
    console.log('Response:', response.data);
  } catch (error) {
    // 错误处理
    console.error('Error:', error.message);
  }
};

// 调用函数发送请求
sendRequest();
