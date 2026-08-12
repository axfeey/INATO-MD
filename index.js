const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const yts = require('yt-search');
const googleTTS = require('google-tts-api');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');
const pino = require('pino');
const express = require('express');

const BOT_NAME = "INATO-MD";
const OWNER_NAME = "axfeey";
const OWNER_NUMBER = "916282144167";
const IMAGE_URL = "https://files.catbox.moe/8pafg5.jpg";
const SUDO_USERS = [OWNER_NUMBER + "@s.whatsapp.net"];

let botMode = "public";
let handlerPrefix = ".";
let sock;

// Web Express Server Setup with Modern Black & White Theme
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>${BOT_NAME} | PAIRING PORTAL</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                    body { background-color: #0d0d0d; color: #ffffff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
                    .container { background: #171717; border: 1px solid #2a2a2a; border-radius: 16px; padding: 40px 30px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
                    .logo-box { display: inline-block; background: #ffffff; color: #000000; font-weight: 900; font-size: 22px; padding: 10px 20px; border-radius: 8px; letter-spacing: 3px; margin-bottom: 20px; text-transform: uppercase; }
                    h2 { font-size: 14px; font-weight: 500; color: #a0a0a0; margin-bottom: 25px; letter-spacing: 1px; }
                    .input-group { margin-bottom: 20px; text-align: left; }
                    label { font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px; font-weight: 600; }
                    input { width: 100%; padding: 14px 16px; background: #0d0d0d; border: 1px solid #333333; border-radius: 8px; color: #ffffff; font-size: 16px; outline: none; text-align: center; letter-spacing: 1px; transition: 0.3s; }
                    input:focus { border-color: #ffffff; }
                    button { width: 100%; padding: 14px; background: #ffffff; color: #000000; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; letter-spacing: 1px; text-transform: uppercase; margin-top: 10px; transition: 0.3s; }
                    button:hover { background: #e0e0e0; transform: translateY(-1px); }
                    .footer { margin-top: 30px; font-size: 12px; color: #555555; }
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

app.get('/pair', async (req, res) => {
    let phone = req.query.phone;
    if (!phone) return res.redirect('/');

    phone = phone.replace(/[^0-9]/g, '');

    if (phone.length < 10) {
        return res.send(`
            <body style="background:#0d0d0d; color:white; text-align:center; padding:50px; font-family:sans-serif;">
                <h3 style="color:#ff4d4d;">Invalid Phone Number! Include country code (e.g. 916282144167)</h3>
                <br><a href="/" style="color:#ffffff;">Go Back</a>
            </body>
        `);
    }

    try {
        if (!sock) {
            await connectToWhatsApp();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        const code = await sock.requestPairingCode(phone);
        res.send(`
            <html>
                <head>
                    <title>${BOT_NAME} | CODE</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                        body { background-color: #0d0d0d; color: #ffffff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
                        .container { background: #171717; border: 1px solid #2a2a2a; border-radius: 16px; padding: 40px 30px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
                        .logo-box { display: inline-block; background: #ffffff; color: #000000; font-weight: 900; font-size: 20px; padding: 8px 16px; border-radius: 8px; letter-spacing: 2px; margin-bottom: 25px; }
                        .code-title { font-size: 13px; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
                        .code-display { font-size: 34px; font-weight: 800; color: #ffffff; background: #0d0d0d; border: 1px dashed #ffffff; padding: 20px; border-radius: 10px; letter-spacing: 6px; margin-bottom: 20px; }
                        p { font-size: 13px; color: #aaaaaa; line-height: 1.5; }
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
            <body style="background:#0d0d0d; color:white; text-align:center; padding:50px; font-family:sans-serif;">
                <h3 style="color:#ff4d4d;">Error requesting code. Try again in 5 seconds!</h3>
                <br><a href="/" style="color:#ffffff;">Go Back</a>
            </body>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Web Portal running on port ${PORT}`);
});

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({ 
        auth: state, 
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        syncFullHistory: false,
        markOnlineOnConnect: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) qrcode.generate(qr, { small: true });
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut && reason !== DisconnectReason.connectionReplaced) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log(`✅ ${BOT_NAME} Connected Successfully!`);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = msg.key.participant || from;
        const isOwner = SUDO_USERS.includes(sender) || msg.key.fromMe;

        // Auto Status View
        if (from === 'status@broadcast') {
            await sock.readMessages([msg.key]);
            const reactions = ['💚', '✨', '🔥', '💯', '👍', '❤️'];
            const randomEmoji = reactions[Math.floor(Math.random() * reactions.length)];
            await sock.sendMessage(from, { react: { text: randomEmoji, key: msg.key } }, { statusJidList: [msg.key.participant] });
            return;
        }

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // Auto Downloader for Links
        if (text.includes("instagram.com") || text.includes("facebook.com") || text.includes("fb.watch") || text.includes("youtu.be") || text.includes("youtube.com")) {
            await sock.sendMessage(from, { text: '📥 *Downloading media...*' }, { quoted: msg });
            
            const fileName = `./temp_${Date.now()}.mp4`;
            const cmd = `yt-dlp -o "${fileName}" -f "b[ext=mp4]/b" "${text.trim()}"`;

            exec(cmd, async (error) => {
                if (error || !fs.existsSync(fileName)) {
                    return sock.sendMessage(from, { text: '❌ Download failed!' }, { quoted: msg });
                }

                await sock.sendMessage(from, { 
                    video: fs.readFileSync(fileName), 
                    caption: `✨ Downloaded by *${BOT_NAME}*\n👑 Owner: *${OWNER_NAME}*`
                }, { quoted: msg });
                
                if (fs.existsSync(fileName)) fs.unlinkSync(fileName);
            });
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
│ ❯ .joke | .quote | .fact
│ ❯ .weather <city> | .news
│ ❯ .lyrics <song>
│ ❯ .groupinfo | .admins
│ ❯ .jid | .url
└─────────────────────────

┌───〔 👮‍♂️ *ADMIN COMMANDS* 〕───
│ ❯ .kick @user | .ban @user
│ ❯ .promote @user | .demote @user
│ ❯ .mute | .unmute
│ ❯ .delete
│ ❯ .tagall | .hidetag <msg>
│ ❯ .setgdesc <text> | .setgname <text>
└─────────────────────────

┌───〔 🔒 *OWNER COMMANDS* 〕───
│ ❯ .mode <public/private>
│ ❯ .clearsession | .cleartmp
│ ❯ .restart | .setpp
└─────────────────────────

┌───〔 🎨 *MEDIA & STICKER* 〕───
│ ❯ .sticker | .s (reply image)
│ ❯ .take <packname>
│ ❯ .removebg (reply image)
└─────────────────────────

┌───〔 🤖 *AI COMMANDS* 〕───
│ ❯ .gpt <question> | .gemini <question>
│ ❯ .imagine <prompt>
└─────────────────────────

┌───〔 📥 *DOWNLOADER* 〕───
│ ❯ .play <song> | .song <song>
│ ❯ .video <name> | .ytmp4 <link>
│ ❯ .instagram <link> | .facebook <link>
└─────────────────────────

┌───〔 💻 *GITHUB COMMANDS* 〕───
│ ❯ .git | .github | .repo | .sc
└─────────────────────────`;

                await sock.sendMessage(from, { image: { url: IMAGE_URL }, caption: fullMenuText }, { quoted: msg });
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
                
                const vidFile = `./temp_vid_${Date.now()}.mp4`;
                const vidCmd = `yt-dlp -o "${vidFile}" -f "b[ext=mp4]/b" "${vid.url}"`;

                exec(vidCmd, async (err) => {
                    if (err || !fs.existsSync(vidFile)) return sock.sendMessage(from, { text: '❌ Video download failed!' }, { quoted: msg });
                    await sock.sendMessage(from, { video: fs.readFileSync(vidFile), caption: `🎥 *${vid.title}*\nBot: *${BOT_NAME}*` }, { quoted: msg });
                    if (fs.existsSync(vidFile)) fs.unlinkSync(vidFile);
                });
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
}

connectToWhatsApp();
