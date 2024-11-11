
(async () => {
    if (process.env.NODE_ENV === 'development') {

        const heapdump = await import('heapdump')
        const takeHeapSnapshot = () => {
            console.log('开始采样数据')
            const snapshotPath = `./dump/heap-${Date.now()}.heapsnapshot`;
            heapdump.writeSnapshot(snapshotPath, (err, filename) => {
                if (err) console.error('Heap snapshot failed:', err);
                else console.log(`Heap snapshot saved to ${filename}`);
            });
        };
        // 每隔60秒生成一次快照
        setInterval(takeHeapSnapshot, 60000);

    }
})()
