module.exports = {
    cmd: ['menu', 'help', 'ping', 'alive', 'info'],
    run: async ({ sock, msg, from, cmd, BOT_NAME, OWNER_NAME, OWNER_NUMBER, IMAGE_URL, handlerPrefix, botMode }) => {
        if (cmd === 'ping') {
            const start = Date.now();
            const initMsg = await sock.sendMessage(from, { text: '⚡ *Pinging...*' }, { quoted: msg });
            const end = Date.now();
            
            return sock.sendMessage(from, { 
                text: `🚀 *Pong!* \`${end - start} ms\``, 
                edit: initMsg.key 
            });
        }
        // ...ബാക്കി മെനു കോഡുകൾ
    }
};
