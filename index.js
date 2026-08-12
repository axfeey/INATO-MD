const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const yts = require('yt-search');
const googleTTS = require('google-tts-api');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');
const pino = require('pino');

const BOT_NAME = "INATO-MD";
const OWNER_NAME = "axfeey";
const OWNER_NUMBER = "916282144167";
const IMAGE_URL = "https://files.catbox.moe/8pafg5.jpg";
const SUDO_USERS = [OWNER_NUMBER + "@s.whatsapp.net"];

let botMode = "public";
let handlerPrefix = ".";

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({ 
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
