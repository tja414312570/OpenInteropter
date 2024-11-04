import portscanner from 'portscanner';

const port = 3000;

portscanner.checkPortStatus(port, '127.0.0.1')
    .then((status) => {
        if (status === 'open') {
            console.log(`端口 ${port} 已被使用.`);
        } else {
            console.log(`端口 ${port} 可用.`);
        }
    })
    .catch((err) => {
        console.error(`检查端口时发生错误: ${err}`);
    });
