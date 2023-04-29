import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import config from 'config'
import { ogg } from './ogg.js'
import { openai } from './openai.js'
import { addivities } from '../data/additives.js'

console.log(config.get('TEST_ENV'))

const INITIAL_SESSION = {
	messages: []
}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use(session())

bot.command('new', async (ctx) => {
	ctx.session = INITIAL_SESSION
	await ctx.reply('Жду вашего голосового или текстового сообщения')
})

bot.command('start', async (ctx) => {
	ctx.session = INITIAL_SESSION
	await ctx.reply('Жду вашего голосового или текстового сообщения')
})

bot.on(message('voice'), async (ctx) => {
	ctx.session ??= INITIAL_SESSION
	try {
		// await ctx.reply(JSON.stringify(ctx.message.voice, null, 2))
		await ctx.reply(code('Сообщение принял. Жду ответ от сервера ...'))
		const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
		const userId = String(ctx.message.from.id)
		const oggPath = await ogg.create(link.href, userId)
		const mp3Path = await ogg.toMp3(oggPath, userId)

		const text = await openai.transcription(mp3Path)

		await ctx.reply(code(`Ваш запрос: ${text}`))

		ctx.session.messages.push({ role: openai.roles.USER, content: text })

		const response = await openai.chat(ctx.session.messages)

		ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content })

		await ctx.reply(response.content)

	} catch (error) {
		console.log(`Error while voice message: ${error}`);
	}
})

bot.on(message('text'), async (ctx) => {
	ctx.session ??= INITIAL_SESSION
	try {
		const text = ctx.message.text.toLowerCase()
		let result = ''
		const textArray = text.split(' ')

		if (textArray[textArray.length - 1] === 'гпт') {
			await ctx.reply(code('Сообщение принял. Жду ответ от сервера ...'))
			ctx.message.text = ctx.message.text.replace("гпт", "")
			ctx.session.messages.push({ role: openai.roles.USER, content: ctx.message.text })
			const response = await openai.chat(ctx.session.messages)
			ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content })
			await ctx.reply(response.content)
		} else {
			const jsonArray = JSON.parse(JSON.stringify(addivities))

			if (textArray.length > 1 && textArray.every(item => !isNaN(parseInt(item)))) {
				let foundItems = []
				for (let i = 0; i < textArray.length; i++) {
					const item = jsonArray.find(item => item.additive.includes(textArray[i]))
					if (item) foundItems.push(`- Добавка: ${item.additive}, Статус: ${item.status}`)
					else foundItems.push(`${textArray[i]}: Ничего не найдено`)
				}
	
				if (foundItems.length > 0) {
					result = `${foundItems.map(item => item).join('\n')}`
				} else {
					result = 'Ничего не найдено'
				}
			} else {
				for (let i = 0; i < jsonArray.length; i++) {
					if (jsonArray[i].additive.toLowerCase().includes(text) || jsonArray[i].namerus.toLowerCase().includes(text)) { // ищем по ключу additive или по namerus
						result = 
							`Найдено: 
								Добавка: ${jsonArray[i].additive}, 
								Наименование: ${jsonArray[i].namerus}, 
								Статус: ${jsonArray[i].status}.`
						break;
					} else {
						result = "Ничего не найдено"
					}
				}
			}
			ctx.reply(result)
		}

		
	} catch (error) {
		console.log(`Error while text message: ${error}`);
	}
})

bot.command('start', async (ctx) => {
  await ctx.reply(JSON.stringify(ctx.message, null, 2))
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))