const messageQueue = require('../config/messageQueue');
const redis = require('../config/redis');

class ExpenseConsumer {
    async start() {
        const channel = (await messageQueue.connect()) || messageQueue.channel;
        const q = await channel.assertQueue('report_expense_events', { durable: true });
        await channel.bindQueue(q.queue, 'expense_events', 'expense.*');

        channel.consume(q.queue, async (msg) => {
            if (!msg) return;
            const event = JSON.parse(msg.content.toString());
            try {
                const userId = event.data.userId;
                await redis.del(`reports:monthly:${userId}`);
                await redis.del(`reports:dashboard:${userId}`);
                channel.ack(msg);
            } catch (e) {
                console.error('Failed to handle event', e);
                channel.nack(msg, false, true);
            }
        });

        console.log('Report consumer started');
    }
}

module.exports = new ExpenseConsumer();

