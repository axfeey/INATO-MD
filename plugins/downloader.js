const yts = require('yt-search');
const axios = require('axios');

module.exports = {
    cmd: ['song', 'mp3', 'play', 'video', 'yt'],
    run: async ({ sock, msg, from, cmd, q, BOT_NAME }) => {
        if (!q) return sock.sendMessage(from, { text: '❌ Please provide a query!' }, { quoted: msg });

        const search = await yts(q);
        if (!search.videos.length) return sock.sendMessage(from, { text: '❌ Media not found!' }, { quoted: msg });

        const vid = search.videos[0];

        if (['song', 'mp3', 'play'].includes(cmd)) {
            await sock.sendMessage(from, { text: `🎶 Downloading Audio: *${vid.title}*` }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(vid.url)}`);
                const downloadUrl = res.data?.result?.download?.url;

                if (downloadUrl) {
                    await sock.sendMessage(from, { audio: { url: downloadUrl }, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg });
                } else {
                    throw new Error("Failed");
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Download error!' }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(from, { text: `🎥 Downloading Video: *${vid.title}*` }, { quoted: msg });
            try {
                const res = await axios.get(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(vid.url)}`);
                const downloadUrl = res.data?.result?.download?.url;

                if (downloadUrl) {
                    await sock.sendMessage(from, { video: { url: downloadUrl }, caption: `🎥 *${vid.title}*\nBot: *${BOT_NAME}*` }, { quoted: msg });
                } else {
                    throw new Error("Failed");
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Download error!' }, { quoted: msg });
            }
        }
    }
};
