const { getSocket } = require('../../bot');
const { getMentions } = require('../../utils/messageUtils');
const { findOrCreateUser } = require('../../utils/userUtils');

module.exports = {
    name: 'compatibilidad',
    description: 'Calcula la compatibilidad entre dos usuarios.',
    category: 'love',
    aliases: ['compatibility', 'comp'],
    async execute(message, args) {
        const sock = getSocket();
        const from = message.key.remoteJid;
        const mentions = await getMentions(message);
        const requesterJid = message.key.participant || message.key.remoteJid;

        let userA_jid, userB_jid;

        if (mentions.length >= 2) {
            userA_jid = mentions[0];
            userB_jid = mentions[1];
        } else if (mentions.length === 1) {
            userA_jid = requesterJid;
            userB_jid = mentions[0];
        } else {
            return sock.sendMessage(from, { text: 'Debes mencionar a una o dos personas.' }, { quoted: message });
        }

        const compatibility = Math.floor(Math.random() * 101);
        let description = '';
        let song = '';

        // Canciones por nivel de compatibilidad
        const songs = {
            perfect: [
                '"Perfect" – Ed Sheeran',
                '"All of Me" – John Legend',
                '"Thinking Out Loud" – Ed Sheeran',
                '"A Thousand Years" – Christina Perri',
                '"Can\'t Help Myself" – The Four Tops',
                '"At Last" – Etta James',
                '"Make You Feel My Love" – Adele',
                '"L-O-V-E" – Nat King Cole',
                '"The Way You Look Tonight" – Frank Sinatra',
                '"Marry Me" – Bruno Mars',
                '"Speechless" – Dan + Shay',
                '"Golden" – Harry Styles'
            ],
            high: [
                '"We Found Love" – Rihanna',
                '"Love Story" – Taylor Swift',
                '"Sugar" – Maroon 5',
                '"Señorita" – Shawn Mendes & Camila Cabello',
                '"Blinding Lights" – The Weeknd',
                '"Watermelon Sugar" – Harry Styles',
                '"Levitating" – Dua Lipa',
                '"Anti-Hero" – Taylor Swift',
                '"As It Was" – Harry Styles',
                '"Good 4 U" – Olivia Rodrigo',
                '"Heat Waves" – Glass Animals',
                '"Stay" – The Kid LAROI & Justin Bieber'
            ],
            good: [
                '"Count on Me" – Bruno Mars',
                '"Better Days" – OneRepublic',
                '"High Hopes" – Panic! At The Disco',
                '"Sunflower" – Post Malone & Swae Lee',
                '"Good as Hell" – Lizzo',
                '"Havana" – Camila Cabello',
                '"What Makes You Beautiful" – One Direction',
                '"Roar" – Katy Perry',
                '"Shake It Off" – Taylor Swift',
                '"Happy" – Pharrell Williams',
                '"Can\'t Stop the Feeling!" – Justin Timberlake',
                '"Uptown Funk" – Mark Ronson ft. Bruno Mars'
            ],
            medium: [
                '"Someone Like You" – Adele',
                '"We Are Never Getting Back Together" – Taylor Swift',
                '"Somebody That I Used to Know" – Gotye',
                '"Rolling in the Deep" – Adele',
                '"Since U Been Gone" – Kelly Clarkson',
                '"Stronger" – Kelly Clarkson',
                '"Fighter" – Christina Aguilera',
                '"Irreplaceable" – Beyoncé',
                '"Before He Cheats" – Carrie Underwood',
                '"You Oughta Know" – Alanis Morissette',
                '"Confident" – Demi Lovato',
                '"New Rules" – Dua Lipa'
            ],
            low: [
                '"Bad Romance" – Lady Gaga',
                '"Toxic" – Britney Spears',
                '"Complicated" – Avril Lavigne',
                '"Problem" – Ariana Grande',
                '"Bad Blood" – Taylor Swift',
                '"Mockingbird" – Eminem',
                '"Somebody\'s Watching Me" – Rockwell',
                '"I Don\'t Want to Be" – Gavin DeGraw',
                '"Torn" – Natalie Imbruglia',
                '"So What" – P!nk',
                '"Stronger" – Britney Spears',
                '"Call Me Maybe" – Carly Rae Jepsen'
            ]
        };

        if (compatibility >= 95) {
            description = '💖 ¡Conexión del alma! Están hechos el uno para el otro.';
            song = songs.perfect[Math.floor(Math.random() * songs.perfect.length)];
        } else if (compatibility >= 80) {
            description = '✨ Alta conexión emocional y mucha química.';
            song = songs.high[Math.floor(Math.random() * songs.high.length)];
        } else if (compatibility >= 60) {
            description = '😊 Buena compatibilidad, con potencial para algo grande.';
            song = songs.good[Math.floor(Math.random() * songs.good.length)];
        } else if (compatibility >= 40) {
            description = '🤔 Tienen sus diferencias, pero podrían funcionar.';
            song = songs.medium[Math.floor(Math.random() * songs.medium.length)];
        } else if (compatibility >= 20) {
            description = '😬 La compatibilidad es baja, pero el amor todo lo puede.';
            song = songs.low[Math.floor(Math.random() * songs.low.length)];
        } else {
            description = '💔 Mejor como amigos... o enemigos.';
            song = songs.low[Math.floor(Math.random() * songs.low.length)];
        }

        const text = `🔮 Compatibilidad entre @${userA_jid.split('@')[0]} y @${userB_jid.split('@')[0]}: ${compatibility}%
${description}
🎶 Canción recomendada: ${song}`;

        sock.sendMessage(from, { text, mentions: [userA_jid, userB_jid] });
    }
};
