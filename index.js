require("dotenv").config();
const { Client, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const client = new Client({
  intents: 3276799,
  allowedMentions: {
    repliedUser: true,
  },
});
const cooldown = new Set();

client.once(Events.ClientReady, (c) => {
  console.log(`Conectado como ${c.user.tag}!`);
});

client.on(Events.MessageCreate, (message) => {
  if (
    message.author.bot ||
    message.content.length <= 4 ||
    /<a?:\w+:\d+>/.test(message.content) ||
    cooldown.has(message.author.id)
  )
    return;

  message.channel.sendTyping();

  let row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("sim").setLabel("Sim").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("nao").setLabel("Não").setStyle(ButtonStyle.Danger)
  );

  cooldown.add(message.author.id);
  setTimeout(() => {
    cooldown.delete(message.author.id);
  }, 15 * 60 * 1000); // 15 minutos

  message
    .reply({
      content: "😊 **|** Opa amigo, precisa que eu te ajude com isso? Se precisar, é só pedir!",
      components: [row],
    })
    .then((m) => {
      const filter = (i) => i.customId === "sim" || i.customId === "nao";

      const collector = message.channel.createMessageComponentCollector({
        filter,
        time: 5 * 60 * 1000, // 5 minutos
      });

      collector.on("collect", (i) => {
        if (i.user.id === message.author.id) {
          if (i.customId == "sim") {
            collector.stop();
            cooldown.add(message.author.id);
            setTimeout(() => {
              cooldown.delete(message.author.id);
            }, 30 * 60 * 1000); // 30 minutos

            message.channel.sendTyping();

            m.edit({
              content: "🙂 **|** Pensando em uma resposta...",
              components: [],
            });

            try {
              fetch("https://api.squarecloud.app/v1/experimental/ai", {
                headers: {
                  Authorization: process.env.SQUARECLOUD_API_KEY,
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  question: message.content,
                }),
                method: "POST",
              })
                .then((res) => res.json())
                .then((r) => {
                  m.edit({
                    content: `${message.author} ${r?.response || r?.code}`,
                    components: [],
                  });
                });
            } catch (err) {
              console.error(err);
            }
          } else if (i.customId == "nao") {
            collector.stop();
            m.delete();

            cooldown.add(message.author.id);
            setTimeout(() => {
              cooldown.delete(message.author.id);
            }, 30 * 60 * 1000); // 30 minutos
          }
        } else {
          i.deferUpdate();
        }
      });
      collector.on("end", (collected, reason) => {
        if (reason == "time") {
          m.delete();
        }
      });
    });
});

client.login(process.env.DISCORD_TOKEN);
