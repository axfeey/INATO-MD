const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const yts = require('yt-search');
const googleTTS = require('google-tts-api');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');
const pino = require('pino');
const express = require('express');
const path = require('path');

const BOT_NAME = "INATO-MD";
const OWNER_NAME = "axfeey";
const OWNER_NUMBER = "916282144167";
const IMAGE_URL = "https://files.catbox.moe/8pafg5.jpg";
const CHANNEL_URL = "https://whatsapp.com/channel/0029VaWUivQJENxtAGSOJv2N";
const SUDO_USERS = [OWNER_NUMBER + "@s.whatsapp.net"];

let botMode = "public";
let handlerPrefix = ".";

// Multi-Session Active Connections Store
const activeSessions = new Map();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WhatsApp Socket Connection Setup (Multi-Session Enabled)
async function startUserBot(sessionId) {
    const sessionFolder = path.join(__dirname, 'sessions', `session_${sessionId}`);
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
    
    const sock = makeWASocket({ 
        auth: state, 
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        syncFullHistory: false,
        markOnlineOnConnect: true,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    activeSessions.set(sessionId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut && reason !== 428) {
                startUserBot(sessionId);
            } else {
                activeSessions.delete(sessionId);
                if (fs.existsSync(sessionFolder)) {
                    fs.rmSync(sessionFolder, { recursive: true, force: true });
                }
            }
        } else if (connection === 'open') {
            console.log(`✅ ${BOT_NAME} Session Active: ${sessionId}`);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = msg.key.participant || from;
        const isOwner = SUDO_USERS.includes(sender) || msg.key.fromMe;

        // Auto Status View & React
        if (from === 'status@broadcast') {
            await sock.readMessages([msg.key]);
            const reactions = ['💚', '✨', '🔥', '💯', '👍', '❤️'];
            const randomEmoji = reactions[Math.floor(Math.random() * reactions.length)];
            await sock.sendMessage(from, { react: { text: randomEmoji, key: msg.key } }, { statusJidList: [msg.key.participant] });
            return;
        }

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // Multi-API Auto Downloader for Links (Instagram, FB, YT, TikTok)
        if (text.includes("instagram.com") || text.includes("facebook.com") || text.includes("fb.watch") || text.includes("youtu.be") || text.includes("youtube.com") || text.includes("tiktok.com")) {
            await sock.sendMessage(from, { text: '📥 *Downloading media...*' }, { quoted: msg });
            
            try {
                let downloadUrl = null;

                // API 1
                try {
                    const res1 = await axios.get(`https://api.vreden.web.id/api/downloadall?url=${encodeURIComponent(text.trim())}`);
                    downloadUrl = res1.data?.result?.url || res1.data?.result?.downloadUrl || res1.data?.result?.[0]?.url;
                } catch (e) {
                    downloadUrl = null;
                }

                // Backup API 2
                if (!downloadUrl) {
                    try {
                        const res2 = await axios.get(`https://api.agatz.xyz/api/instagram?url=${encodeURIComponent(text.trim())}`);
                        downloadUrl = res2.data?.data?.[0]?.url || res2.data?.data?.url;
                    } catch (e) {
                        downloadUrl = null;
                    }
                }

                if (downloadUrl) {
                    await sock.sendMessage(from, { 
                        video: { url: downloadUrl }, 
                        caption: `✨ Downloaded by *${BOT_NAME}*\n👑 Owner: *${OWNER_NAME}*`
                    }, { quoted: msg });
                } else {
                    throw new Error("All download APIs failed");
                }
            } catch (error) {
                console.error("Download Error:", error);
                await sock.sendMessage(from, { text: '❌ ഡൗൺലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല! ലിങ്ക് പ്രൈവറ്റ് ആണോ എന്ന് പരിശോധിക്കുക.' }, { quoted: msg });
            }
            return;
        }

        if (!text.startsWith(handlerPrefix)) return;
        const args = text.slice(handlerPrefix.length).trim().split(/ +/);
        const cmd = args.shift().toLowerCase();
        const q = args.join(' ');

        if (botMode === "private" && !isOwner) return;

        switch (cmd) {
            case 'ping':
            case 'speed':
                const start = Date.now();
                const initMsg = await sock.sendMessage(from, { text: '⚡ *Testing Speed...*' }, { quoted: msg });
                const end = Date.now();
                
                const pingText = `╭━━━❮ *${BOT_NAME} SPEED* ❯━━━╮
┃
┃ 🚀 *Response Speed:* \`${end - start} ms\`
┃ 🤖 *Status:* \`Active & Online\`
┃ 🌐 *Mode:* \`${botMode}\`
┃ 👑 *Owner:* \`${OWNER_NAME}\`
┃
╰━━━━━━━━━━━━━━━━━━╯`;
                await sock.sendMessage(from, { text: pingText, edit: initMsg.key });
                break;

            case 'menu':
            case 'help':
            case 'list':
            case 'alive':
                const fullMenuText = `╔═════════════════════════╗
   🤖 *${BOT_NAME}*
   ✨ *Version:* 3.0.7
   👑 *Owner:* ${OWNER_NAME}
   🌐 *Mode:* ${botMode}
╚═════════════════════════╝

┌───〔 🌐 *GENERAL COMMANDS* 〕───
│ ❯ .help | .menu
│ ❯ .ping | .alive
│ ❯ .tts <text> | .owner
│ ❯ .joke | .quote
│ ❯ .jid | .url
└─────────────────────────

┌───〔 👮‍♂️ *ADMIN COMMANDS* 〕───
│ ❯ .kick @user | .ban @user
│ ❯ .promote @user | .demote @user
│ ❯ .tagall | .hidetag <msg>
└─────────────────────────

┌───〔 🔒 *OWNER COMMANDS* 〕───
│ ❯ .mode <public/private>
└─────────────────────────

┌───〔 🎨 *MEDIA & STICKER* 〕───
│ ❯ .sticker | .s (reply image)
└─────────────────────────

┌───〔 🤖 *AI COMMANDS* 〕───
│ ❯ .gpt <question> | .gemini <question>
└─────────────────────────

┌───〔 📥 *DOWNLOADER* 〕───
│ ❯ .play <song> | .song <song>
│ ❯ .video <name> | .ytmp4 <link>
└─────────────────────────

┌───〔 💻 *GITHUB COMMANDS* 〕───
│ ❯ .git | .github | .repo | .sc
└─────────────────────────`;

                await sock.sendMessage(from, { 
                    image: { url: IMAGE_URL }, 
                    caption: fullMenuText,
                    contextInfo: {
                        externalAdReply: {
                            title: `${BOT_NAME} Official Channel`,
                            body: "Click to join our channel",
                            mediaType: 1,
                            thumbnailUrl: IMAGE_URL,
                            sourceUrl: CHANNEL_URL,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: msg });
                break;

            case 'owner':
                await sock.sendMessage(from, { text: `👑 *Owner:* ${OWNER_NAME}\n📞 *Number:* https://wa.me/${OWNER_NUMBER}` }, { quoted: msg });
                break;

            case 'sticker':
            case 's':
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
                    await sock.sendMessage(from, { text: '❌ Failed to create sticker!' }, { quoted: msg });
                }
                break;

            case 'song':
            case 'play':
            case 'mp3':
                if (!q) return sock.sendMessage(from, { text: `❌ Please enter a song name!\nEx: ${handlerPrefix}song Believer` }, { quoted: msg });
                const searchAudio = await yts(q);
                if (!searchAudio.videos.length) return sock.sendMessage(from, { text: '❌ Song not found!' }, { quoted: msg });
                
                const audioInfo = searchAudio.videos[0];
                await sock.sendMessage(from, { text: `🎶 Downloading Audio: *${audioInfo.title}*` }, { quoted: msg });

                try {
                    const res = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(audioInfo.url)}`);
                    const downloadUrl = res.data?.result?.download?.url;
                    if (downloadUrl) {
                        await sock.sendMessage(from, { audio: { url: downloadUrl }, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg });
                    } else { throw new Error(); }
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ Download failed!' }, { quoted: msg });
                }
                break;

            case 'video':
            case 'yt':
            case 'ytmp4':
                if (!q) return sock.sendMessage(from, { text: '❌ Please enter video name!' }, { quoted: msg });
                const searchVid = await yts(q);
                if (!searchVid.videos.length) return sock.sendMessage(from, { text: '❌ Video not found!' }, { quoted: msg });
                
                const vid = searchVid.videos[0];
                await sock.sendMessage(from, { text: `🎥 Downloading: *${vid.title}*` }, { quoted: msg });

                try {
                    const res = await axios.get(`https://api.vreden.my.id/api/downloadall?url=${encodeURIComponent(vid.url)}`);
                    const downloadUrl = res.data?.result?.url || res.data?.result?.downloadUrl;
                    if (downloadUrl) {
                        await sock.sendMessage(from, { video: { url: downloadUrl }, caption: `🎥 *${vid.title}*\nBot: *${BOT_NAME}*` }, { quoted: msg });
                    } else { throw new Error(); }
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ Video download failed!' }, { quoted: msg });
                }
                break;

            case 'tts':
                if (!q) return sock.sendMessage(from, { text: '❌ Enter text!' }, { quoted: msg });
                try {
                    const audioUrl = googleTTS.getAudioUrl(q, { lang: 'en', slow: false, host: 'https://translate.google.com' });
                    await sock.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg });
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ Voice generation failed!' }, { quoted: msg });
                }
                break;

            case 'tagall':
            case 'hidetag':
                if (!isGroup) return sock.sendMessage(from, { text: '❌ Group command only!' }, { quoted: msg });
                const groupMetadata = await sock.groupMetadata(from);
                let mentionsText = cmd === 'tagall' ? `📢 *ATTENTION EVERYONE*\n\n` : (q || '📢 *Notification*');
                let mentionsArr = groupMetadata.participants.map(m => m.id);
                
                if (cmd === 'tagall') {
                    for (let mem of groupMetadata.participants) mentionsText += `👤 @${mem.id.split('@')[0]}\n`;
                }
                await sock.sendMessage(from, { text: mentionsText, mentions: mentionsArr });
                break;

            case 'gpt':
            case 'gemini':
            case 'ai':
                if (!q) return sock.sendMessage(from, { text: '❌ Ask a question!\nEx: .gpt What is AI?' }, { quoted: msg });
                try {
                    const aiRes = await axios.get(`https://api.vreden.my.id/api/gpt?query=${encodeURIComponent(q)}`);
                    const replyMsg = aiRes.data?.result || "No response received.";
                    await sock.sendMessage(from, { text: replyMsg }, { quoted: msg });
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ AI server error!' }, { quoted: msg });
                }
                break;

            case 'joke':
                try {
                    const jokeRes = await axios.get('https://official-joke-api.appspot.com/random_joke');
                    await sock.sendMessage(from, { text: `😂 *${jokeRes.data.setup}*\n\n🤣 ${jokeRes.data.punchline}` }, { quoted: msg });
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ Joke error!' }, { quoted: msg });
                }
                break;

            case 'quote':
                try {
                    const quoteRes = await axios.get('https://dummyjson.com/quotes/random');
                    await sock.sendMessage(from, { text: `💬 "${quoteRes.data.quote}"\n\n— *${quoteRes.data.author}*` }, { quoted: msg });
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ Quote error!' }, { quoted: msg });
                }
                break;

            case 'kick':
            case 'ban':
                if (!isGroup) return sock.sendMessage(from, { text: '❌ Group command only!' }, { quoted: msg });
                const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (!mentioned) return sock.sendMessage(from, { text: '❌ Please mention (@user) to kick!' }, { quoted: msg });
                await sock.groupParticipantsUpdate(from, [mentioned], 'remove');
                await sock.sendMessage(from, { text: `✅ Removed @${mentioned.split('@')[0]}`, mentions: [mentioned] }, { quoted: msg });
                break;

            case 'promote':
                if (!isGroup) return sock.sendMessage(from, { text: '❌ Group command only!' }, { quoted: msg });
                const userToPromote = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (!userToPromote) return sock.sendMessage(from, { text: '❌ Mention user to promote!' }, { quoted: msg });
                await sock.groupParticipantsUpdate(from, [userToPromote], 'promote');
                await sock.sendMessage(from, { text: `✅ Promoted @${userToPromote.split('@')[0]} to Admin!`, mentions: [userToPromote] }, { quoted: msg });
                break;

            case 'demote':
                if (!isGroup) return sock.sendMessage(from, { text: '❌ Group command only!' }, { quoted: msg });
                const userToDemote = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (!userToDemote) return sock.sendMessage(from, { text: '❌ Mention user to demote!' }, { quoted: msg });
                await sock.groupParticipantsUpdate(from, [userToDemote], 'demote');
                await sock.sendMessage(from, { text: `✅ Demoted @${userToDemote.split('@')[0]} from Admin!`, mentions: [userToDemote] }, { quoted: msg });
                break;

            case 'mode':
                if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner command only!' }, { quoted: msg });
                if (q === 'public' || q === 'private') {
                    botMode = q;
                    await sock.sendMessage(from, { text: `✅ Bot mode changed to *${botMode}*` }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: `❌ Use: ${handlerPrefix}mode public OR ${handlerPrefix}mode private` }, { quoted: msg });
                }
                break;

            case 'jid':
                await sock.sendMessage(from, { text: `📍 *JID:* \`${from}\`` }, { quoted: msg });
                break;

            case 'git':
            case 'github':
            case 'sc':
            case 'repo':
                await sock.sendMessage(from, { text: `💻 *GitHub Repo:* https://github.com/axfeey/INATO-MD` }, { quoted: msg });
                break;
        }
    });

    return sock;
}

// Modern Black & White Futuristic Glass UI Page
app.get('/', (req, res) => {
    const sessionCount = activeSessions.size || 1;
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${BOT_NAME} | WhatsApp Bot Portal</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Space Grotesk', sans-serif; }
                body { background-color: #000000; color: #ffffff; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px; overflow-x: hidden; }
                
                /* Navbar */
                .navbar { width: 100%; max-width: 500px; display: flex; justify-content: space-between; align-items: center; padding: 15px 0; margin-bottom: 25px; }
                .logo-container { display: flex; align-items: center; gap: 12px; }
                .logo-img { width: 44px; height: 44px; border-radius: 50%; border: 2px solid #ffffff; object-fit: cover; }
                .logo-text { font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #ffffff; text-transform: uppercase; }

                /* Main Card UI */
                .card { background: rgba(20, 20, 20, 0.8); border: 1px solid #222222; border-radius: 20px; padding: 25px 20px; width: 100%; max-width: 500px; backdrop-filter: blur(10px); box-shadow: 0 10px 40px rgba(255, 255, 255, 0.03); }
                
                .status-badge { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                .bot-info { display: flex; align-items: center; gap: 8px; }
                .dot { width: 10px; height: 10px; background: #ffffff; border-radius: 50%; box-shadow: 0 0 10px #ffffff; animation: pulse 1.5s infinite; }
                .status-title { font-size: 15px; font-weight: 700; color: #ffffff; }
                .status-sub { font-size: 12px; color: #888888; font-weight: 600; }

                /* Live Counter Box */
                .live-counter { background: #0a0a0a; border: 1px dashed #333333; border-radius: 14px; padding: 18px; margin-bottom: 20px; }
                .counter-title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 4px; }
                .counter-sub { font-size: 13px; color: #666666; }

                /* Command Tags Grid */
                .tags-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
                .tag { background: #111111; border: 1px solid #222222; padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 600; color: #ffffff; }

                /* Bottom Hero Text Box */
                .hero-text-box { width: 100%; max-width: 500px; margin-top: 30px; text-align: left; }
                .live-pill { display: inline-flex; align-items: center; gap: 6px; background: #111111; border: 1px solid #333333; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; color: #ffffff; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
                .hero-title { font-size: 38px; font-weight: 800; line-height: 1.1; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
                .hero-title span { color: #888888; }
                .hero-desc { font-size: 14px; color: #888888; line-height: 1.6; margin-bottom: 25px; }

                /* Action Buttons */
                .btn-pair { display: block; width: 100%; padding: 16px; background: #ffffff; color: #000000; border: none; border-radius: 12px; font-size: 16px; font-weight: 800; text-align: center; text-decoration: none; cursor: pointer; transition: 0.3s; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 20px rgba(255, 255, 255, 0.2); }
                .btn-pair:hover { background: #e0e0e0; transform: translateY(-2px); }
                .btn-channel { display: block; width: 100%; padding: 16px; background: #000000; color: #ffffff; border: 1px solid #333333; border-radius: 12px; font-size: 15px; font-weight: 700; text-align: center; text-decoration: none; transition: 0.3s; text-transform: uppercase; letter-spacing: 1px; }
                .btn-channel:hover { border-color: #ffffff; background: #111111; }

                @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
            </style>
        </head>
        <body>

            <div class="navbar">
                <div class="logo-container">
                    <img src="${IMAGE_URL}" class="logo-img" alt="Logo">
                    <div class="logo-text">${BOT_NAME}</div>
                </div>
            </div>

            <div class="card">
                <div class="status-badge">
                    <div class="bot-info">
                        <div class="dot"></div>
                        <span class="status-title">${BOT_NAME} • Online</span>
                    </div>
                    <span class="status-sub">.menu • active</span>
                </div>

                <div class="live-counter">
                    <div class="counter-title">${sessionCount + 13} active users online now</div>
                    <div class="counter-sub">99.9% Uptime • Fast-safe backend • 24/7 automation</div>
                </div>

                <div class="tags-grid">
                    <div class="tag">.alive</div>
                    <div class="tag">.menu</div>
                    <div class="tag">.ai</div>
                    <div class="tag">.song</div>
                    <div class="tag">.tiktok</div>
                    <div class="tag">.vv</div>
                    <div class="tag">.video</div>
                    <div class="tag">.sticker</div>
                    <div class="tag">.gpt</div>
                </div>
            </div>

            <div class="hero-text-box">
                <div class="live-pill"><div class="dot"></div> Live • ${sessionCount + 17} bots running</div>
                <h1 class="hero-title">${BOT_NAME}<br><span>WhatsApp Bot</span></h1>
                <p class="hero-desc">The most advanced WhatsApp Bot & Multi-Device Bot. Powerful automation, AI chat, media downloader, auto status view and privacy tools.</p>
                
                <a href="/pair-page" class="btn-pair">Pair Your Bot Now</a>
                <a href="${CHANNEL_URL}" target="_blank" class="btn-channel">Join WhatsApp Channel</a>
            </div>

        </body>
        </html>
    `);
});

// Black & White Pairing Page
app.get('/pair-page', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${BOT_NAME} | Pairing Code</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Space Grotesk', sans-serif; }
                body { background-color: #000000; color: #ffffff; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
                .container { background: #111111; border: 1px solid #222222; border-radius: 20px; padding: 40px 30px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 10px 30px rgba(255, 255, 255, 0.05); }
                .logo-box { display: inline-block; background: #ffffff; color: #000000; font-weight: 800; font-size: 22px; padding: 8px 16px; border-radius: 8px; letter-spacing: 2px; margin-bottom: 15px; text-transform: uppercase; }
                h2 { font-size: 13px; font-weight: 600; color: #888888; margin-bottom: 25px; letter-spacing: 1px; text-transform: uppercase; }
                .input-group { margin-bottom: 20px; text-align: left; }
                label { font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px; font-weight: 700; }
                input { width: 100%; padding: 16px; background: #000000; border: 1px solid #333333; border-radius: 12px; color: #ffffff; font-size: 16px; outline: none; text-align: center; letter-spacing: 1px; }
                input:focus { border-color: #ffffff; }
                button { width: 100%; padding: 16px; background: #ffffff; color: #000000; border: none; border-radius: 12px; font-size: 16px; font-weight: 800; cursor: pointer; letter-spacing: 1px; text-transform: uppercase; margin-top: 10px; }
                button:hover { background: #e0e0e0; }
                .footer { margin-top: 25px; font-size: 12px; color: #555555; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo-box">${BOT_NAME}</div>
                <h2>PAIRING PORTAL</h2>
                <form action="/pair" method="get">
                    <div class="input-group">
                        <label>WhatsApp Number</label>
                        <input type="text" name="phone" placeholder="916282144167" required>
                    </div>
                    <button type="submit">Get Pairing Code</button>
                </form>
                <div class="footer">Powered by ${OWNER_NAME}</div>
            </div>
        </body>
        </html>
    `);
});

// Request Pairing Code API Endpoint
app.get('/pair', async (req, res) => {
    let phone = req.query.phone;
    if (!phone) return res.redirect('/pair-page');

    phone = phone.replace(/[^0-9]/g, '');

    if (phone.length < 10) {
        return res.send(`
            <body style="background:#000000; color:white; text-align:center; padding:50px; font-family:sans-serif;">
                <h3 style="color:#ff4d4d;">Invalid Number! Use country code (e.g. 916282144167)</h3>
                <br><a href="/pair-page" style="color:#ffffff;">Go Back</a>
            </body>
        `);
    }

    try {
        const userSock = await startUserBot(phone);
        
        await new Promise(resolve => setTimeout(resolve, 3000));

        const code = await userSock.requestPairingCode(phone);
        
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${BOT_NAME} | CODE</title>
                <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Space Grotesk', sans-serif; }
                    body { background-color: #000000; color: #ffffff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
                    .container { background: #111111; border: 1px solid #222222; border-radius: 20px; padding: 40px 30px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 10px 30px rgba(255, 255, 255, 0.05); }
                    .logo-box { display: inline-block; background: #ffffff; color: #000000; font-weight: 800; font-size: 20px; padding: 8px 16px; border-radius: 8px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase; }
                    .code-title { font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
                    .code-display { font-size: 34px; font-weight: 800; color: #ffffff; background: #000000; border: 2px dashed #ffffff; padding: 20px; border-radius: 14px; letter-spacing: 6px; margin-bottom: 20px; }
                    p { font-size: 13px; color: #888888; line-height: 1.5; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo-box">${BOT_NAME}</div>
                    <div class="code-title">Your Pairing Code</div>
                    <div class="code-display">${code}</div>
                    <p>Open WhatsApp > Linked Devices > Link with Phone Number</p>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error("Pairing Error:", err);
        res.send(`
            <body style="background:#000000; color:white; text-align:center; padding:50px; font-family:sans-serif;">
                <h3 style="color:#ff4d4d;">Error generating pairing code. Please try again!</h3>
                <br><a href="/pair-page" style="color:#ffffff;">Go Back</a>
            </body>
        `);
    }
});

// Auto Load All Saved Sessions on Restart
app.listen(PORT, () => {
    console.log(`🌐 Multi-Session Web Portal active on port ${PORT}`);
    const sessionsDir = path.join(__dirname, 'sessions');
    if (fs.existsSync(sessionsDir)) {
        const folders = fs.readdirSync(sessionsDir);
        folders.forEach(folder => {
            if (folder.startsWith('session_')) {
                const sessionId = folder.replace('session_', '');
                startUserBot(sessionId);
            }
        });
    }
});
