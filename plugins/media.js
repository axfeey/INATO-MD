const googleTTS = require('google-tts-api');

module.exports = {
    cmd: ['sticker', 's', 'tts'],
    run: async ({ sock, msg, from, cmd, q, downloadContentFromMessage }) => {
        if (['sticker', 's'].includes(cmd)) {
            const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
            const targetMedia = quotedMsg || msg.message;
            const type = targetMedia?.imageMessage ? 'image' : targetMedia?.videoMessage ? 'video' : null;

            if (!type) return sock.sendMessage(from, { text: '❌ Reply to an image/video with *.sticker*' }, { quoted: msg });

            try {
                const stream = await downloadContentFromMessage(targetMedia[`${type}Message`], type);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Sticker creation failed!' }, { quoted: msg });
            }
        } else if (cmd === 'tts') {
            if (!q) return sock.sendMessage(from, { text: '❌ Enter text!' }, { quoted: msg });
            try {
                const audioUrl = googleTTS.getAudioUrl(q, { lang: 'en', slow: false, host: 'https://translate.google.com' });
                await sock.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Voice generation failed!' }, { quoted: msg });
            }
        }
    }
};
