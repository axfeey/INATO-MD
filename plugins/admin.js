module.exports = {
    cmd: ['menu', 'help', 'ping', 'alive', 'info'],
    run: async ({ sock, msg, from, cmd, BOT_NAME, OWNER_NAME, OWNER_NUMBER, IMAGE_URL, handlerPrefix, botMode }) => {
        if (cmd === 'ping') {
            const start = Date.now();
            const initMsg = await sock.sendMessage(from, { text: '⚡ *Testing Speed...*' }, { quoted: msg });
            const end = Date.now();
            return sock.sendMessage(from, { 
                text: `╭━━━❮ *${BOT_NAME} SPEED* ❯━━━╮\n┃\n┃ 🚀 *Response:* \`${end - start} ms\`\n┃ 🤖 *Status:* \`Active\`\n┃ 🌐 *Mode:* \`${botMode}\`\n┃\n╰━━━━━━━━━━━━━━━━━━╯`, 
                edit: initMsg.key 
            });
        }

        const menuText = `╭───〔 🤖 *${BOT_NAME}* 〕───
│ 👤 *Owner:* ${OWNER_NAME}
│ 📞 *Contact:* ${OWNER_NUMBER}
│ 🌐 *Mode:* ${botMode}
│ ⚙️ *Prefix:* [ ${handlerPrefix} ]
╰──────────────────

╭───〔 📥 *DOWNLOADERS* 〕───
│ 🎵 \`${handlerPrefix}song\` <name>
│ 🎥 \`${handlerPrefix}video\` <name>
╰──────────────────

╭───〔 🎨 *MEDIA & TOOLS* 〕───
│ 🎨 \`${handlerPrefix}sticker\` (reply image)
│ 🗣️ \`${handlerPrefix}tts\` <text>
╰──────────────────

╭───〔 👮‍♂️ *GROUP ADMIN* 〕───
│ 🏷️ \`${handlerPrefix}tagall\`
│ 🚫 \`${handlerPrefix}kick\` @user
╰──────────────────

╭───〔 🤖 *AI COMMANDS* 〕───
│ 💡 \`${handlerPrefix}gpt\` <query>
╰──────────────────`;

        await sock.sendMessage(from, { image: { url: IMAGE_URL }, caption: menuText }, { quoted: msg });
    }
};
