import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 配置代理服务器
const proxyAgent = new HttpsProxyAgent('http://127.0.0.1:8081');
// 创建一个忽略证书错误的 HTTPS 代理
// 要发送的数据
const data = { "hello world": "example", "message": "[sssss]" };

// 使用 async/await 发送 POST 请求
const sendRequest = async () => {
    try {
        const response = await axios.post('https://jsonplaceholder.typicode.com/posts', data, {
            httpsAgent: proxyAgent, // 使用代理
            httpAgent: proxyAgent,
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
