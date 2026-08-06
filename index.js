const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const yts = require('yt-search');
const googleTTS = require('google-tts-api');
const fs = require('fs');
const { exec } = require('child_process');
const fetch = require('node-fetch');
const FormData = require('form-data');
const axios = require('axios');

const BOT_NAME = "INATO-MD";
const OWNER_NAME = "axfeey";
const OWNER_NUMBER = "916282144167";
const IMAGE_URL = "https://files.catbox.moe/8pafg5.jpg";
const SUDO_USERS = [OWNER_NUMBER + "@s.whatsapp.net"];

let botMode = "public";
let handlerPrefix = ".";

// All Media Messages with Owner/Bot Context Info
const getBotContext = () => {
    return {
        contextInfo: {
            externalAdReply: {
                title: `${BOT_NAME} • WhatsApp Bot`,
                body: `Created by ${OWNER_NAME}`,
                mediaType: 1,
                renderLargerThumbnail: false,
                thumbnailUrl: IMAGE_URL,
                sourceUrl: `https://wa.me/${OWNER_NUMBER}`
            }
        }
    };
};

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    // Terminal-ൽ തനിയെ QR Code വരാനായി printQRInTerminal true ആക്കി
    const sock = makeWASocket({ 
        auth: state, 
        printQRInTerminal: true 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrcode.generate(qr, { small: true });
        }
        
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

        // Auto Status View & Reaction
        if (from === 'status@broadcast') {
            await sock.readMessages([msg.key]);
            const reactions = ['💚', '✨', '🔥', '💯', '👍', '❤️'];
            const randomEmoji = reactions[Math.floor(Math.random() * reactions.length)];
            await sock.sendMessage(from, { react: { text: randomEmoji, key: msg.key } }, { statusJidList: [msg.key.participant] });
            return;
        }

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // Auto Download Links using yt-dlp
        if (text.includes("instagram.com") || text.includes("facebook.com") || text.includes("fb.watch") || text.includes("youtu.be") || text.includes("youtube.com")) {
            await sock.sendMessage(from, { text: '│ 📥 *Downloading media...*', ...getBotContext() }, { quoted: msg });
            
            const fileName = `./temp_${Date.now()}.mp4`;
            const cmd = `yt-dlp -o "${fileName}" -f "b[ext=mp4]/b" "${text.trim()}"`;

            exec(cmd, async (error) => {
                if (error || !fs.existsSync(fileName)) {
                    return sock.sendMessage(from, { text: '│ ❌ ഡൗൺലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല!', ...getBotContext() }, { quoted: msg });
                }

                await sock.sendMessage(from, { 
                    video: fs.readFileSync(fileName), 
                    caption: `│ Downloaded by *${BOT_NAME}*\n│ Owner: *${OWNER_NAME}*`,
                    ...getBotContext()
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
                const start = Date.now();
                await sock.sendMessage(from, { text: '│ ⚡ *Checking latency...*' }, { quoted: msg });
                const end = Date.now();
                
                const pingText = `┌───〔 🏓 *BOT SPEED* 〕
│
│ 🚀 *Latency:* ${end - start} ms
│ 🤖 *Bot:* ${BOT_NAME}
│ 🌐 *Mode:* ${botMode}
│ 👑 *Owner:* ${OWNER_NAME}
│
└───〔 *${BOT_NAME}* 〕`;
                await sock.sendMessage(from, { text: pingText, ...getBotContext() }, { quoted: msg });
                break;

            case 'menu':
            case 'list':
            case 'info':
            case 'alive':
                const menuText = `┌───〔 🤖 *${BOT_NAME}* 〕
│
│ 👤 *Owner:* ${OWNER_NAME}
│ 📞 *Contact:* ${OWNER_NUMBER}
│ 🌐 *Mode:* ${botMode}
│ ⚙️ *Prefix:* [ ${handlerPrefix} ]
│
├───〔 📌 *ALL COMMANDS* 〕
│
│ 🛠️ ${handlerPrefix}info       │ 📜 ${handlerPrefix}menu
│ 🏓 ${handlerPrefix}ping       │ 🔒 ${handlerPrefix}mode
│ 🎵 ${handlerPrefix}song       │ 🎶 ${handlerPrefix}mp3
│ 🎥 ${handlerPrefix}video      │ 🗣️ ${handlerPrefix}tts
│ 🎨 ${handlerPrefix}sticker    │ 🏷️ ${handlerPrefix}tagall
│
└───〔 ✦ *${BOT_NAME}* ✦ 〕`;

                await sock.sendMessage(from, { image: { url: IMAGE_URL }, caption: menuText, ...getBotContext() }, { quoted: msg });
                break;

            case 'song':
            case 'mp3':
            case 'play':
            case 'ytmp3':
                if (!q) return sock.sendMessage(from, { text: `│ ❌ പാട്ടിന്റെ പേര് നൽകുക!\n│ Ex: ${handlerPrefix}mp3 Aavesham`, ...getBotContext() }, { quoted: msg });
                
                const searchAudio = await yts(q);
                if (!searchAudio.videos.length) return sock.sendMessage(from, { text: '│ ❌ പാട്ട് കണ്ടെത്താനായില്ല!', ...getBotContext() }, { quoted: msg });
                
                const audioInfo = searchAudio.videos[0];
                await sock.sendMessage(from, { text: `│ 🎶 Downloading Audio: *${audioInfo.title}*`, ...getBotContext() }, { quoted: msg });

                const songFile = `./temp_audio_${Date.now()}.mp3`;
                const dlCmd = `yt-dlp -x --audio-format mp3 -o "${songFile}" "${audioInfo.url}"`;

                exec(dlCmd, async (err) => {
                    if (!err && fs.existsSync(songFile)) {
                        await sock.sendMessage(from, { 
                            audio: fs.readFileSync(songFile), 
                            mimetype: 'audio/mpeg', 
                            fileName: `${audioInfo.title}.mp3`,
                            ptt: false,
                            ...getBotContext()
                        }, { quoted: msg });
                        fs.unlinkSync(songFile);
                    } else {
                        // Fallback API if yt-dlp fails
                        try {
                            const res = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(audioInfo.url)}`);
                            if (res.data?.result?.download?.url) {
                                await sock.sendMessage(from, { 
                                    audio: { url: res.data.result.download.url }, 
                                    mimetype: 'audio/mpeg',
                                    ptt: false,
                                    ...getBotContext()
                                }, { quoted: msg });
                            } else {
                                throw new Error("Download failed");
                            }
                        } catch (e) {
                            await sock.sendMessage(from, { text: '│ ❌ ഓഡിയോ ഡൗൺലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല!', ...getBotContext() }, { quoted: msg });
                        }
                    }
                });
                break;

            case 'video':
            case 'yt':
            case 'ytmp4':
                if (!q) return sock.sendMessage(from, { text: '│ ❌ വീഡിയോയുടെ പേര് നൽകുക!', ...getBotContext() }, { quoted: msg });
                
                const searchVid = await yts(q);
                if (!searchVid.videos.length) return sock.sendMessage(from, { text: '│ ❌ വീഡിയോ കണ്ടെത്താനായില്ല!', ...getBotContext() }, { quoted: msg });
                
                const vid = searchVid.videos[0];
                await sock.sendMessage(from, { text: `│ 🎥 Downloading: *${vid.title}*`, ...getBotContext() }, { quoted: msg });
                
                const vidFile = `./temp_vid_${Date.now()}.mp4`;
                const vidCmd = `yt-dlp -o "${vidFile}" -f "b[ext=mp4]/b" "${vid.url}"`;

                exec(vidCmd, async (err) => {
                    if (err || !fs.existsSync(vidFile)) {
                        return sock.sendMessage(from, { text: '│ ❌ വീഡിയോ ഡൗൺലോഡ് പരാജയപ്പെട്ടു!', ...getBotContext() }, { quoted: msg });
                    }

                    await sock.sendMessage(from, { 
                        video: fs.readFileSync(vidFile), 
                        caption: `│ 🎥 *${vid.title}*\n│ Bot: *${BOT_NAME}*`, 
                        ...getBotContext() 
                    }, { quoted: msg });
                    
                    if (fs.existsSync(vidFile)) fs.unlinkSync(vidFile);
                });
                break;

            case 'tts':
                if (!q) return sock.sendMessage(from, { text: '│ ❌ ടെക്സ്റ്റ് നൽകുക!', ...getBotContext() }, { quoted: msg });
                try {
                    const isMalayalam = /[\u0D00-\u0D7F]/.test(q);
                    const lang = isMalayalam ? 'ml' : 'en';
                    const audioUrl = googleTTS.getAudioUrl(q, { lang: lang, slow: false, host: 'https://translate.google.com' });
                    
                    await sock.sendMessage(from, { 
                        audio: { url: audioUrl }, 
                        mimetype: 'audio/mpeg', 
                        ptt: false,
                        ...getBotContext()
                    }, { quoted: msg });
                } catch (e) {
                    await sock.sendMessage(from, { text: '│ ❌ വോയ്‌സ് ഉണ്ടാക്കാൻ പറ്റിയില്ല!', ...getBotContext() }, { quoted: msg });
                }
                break;

            case 'tagall':
            case 'tag':
                if (!isGroup) return sock.sendMessage(from, { text: '│ ❌ ഗ്രൂപ്പിൽ മാത്രം ഉപയോഗിക്കുക!', ...getBotContext() }, { quoted: msg });
                const groupMetadata = await sock.groupMetadata(from);
                let mentionsText = `┌───〔 📢 *ATTENTION EVERYONE* 〕\n│\n`;
                let mentionsArr = [];
                for (let mem of groupMetadata.participants) {
                    mentionsText += `│ 👤 @${mem.id.split('@')[0]}\n`;
                    mentionsArr.push(mem.id);
                }
                mentionsText += `│\n└───〔 *${BOT_NAME}* 〕`;
                await sock.sendMessage(from, { text: mentionsText, mentions: mentionsArr, ...getBotContext() });
                break;

            case 'sticker':
            case 's':
                const quotedMediaForSticker = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const targetMsg = quotedMediaForSticker || msg.message;
                if (!targetMsg.imageMessage) return sock.sendMessage(from, { text: '│ ❌ ഫോട്ടോയ്ക്ക് റിപ്ലൈയായി .sticker എന്ന് അയക്കുക!', ...getBotContext() }, { quoted: msg });

                const mediaStream = await downloadContentFromMessage(targetMsg.imageMessage, 'image');
                let mediaBuffer = Buffer.from([]);
                for await (const chunk of mediaStream) mediaBuffer = Buffer.concat([mediaBuffer, chunk]);

                await sock.sendMessage(from, { sticker: mediaBuffer, ...getBotContext() }, { quoted: msg });
                break;
        }
    });
}

connectToWhatsApp();
