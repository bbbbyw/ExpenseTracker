const amqp = require('amqplib');

class MessageQueue {
    constructor() {
        this.connection = null;
        this.channel = null;
    }

    async connect() {
        if (this.channel) return;
        this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        this.channel = await this.connection.createChannel();
        await this.channel.assertExchange('expense_events', 'topic', { durable: true });
        console.log('Expense Service connected to RabbitMQ');
    }

    async publish(eventKey, payload) {
        const message = JSON.stringify({ event: eventKey, data: payload, timestamp: new Date().toISOString() });
        this.channel.publish('expense_events', eventKey, Buffer.from(message), { persistent: true });
    }

    async publishExpenseCreated(expense) {
        await this.publish('expense.created', expense);
    }

    async publishExpenseUpdated(expense) {
        await this.publish('expense.updated', expense);
    }

    async publishExpenseDeleted(id, userId) {
        await this.publish('expense.deleted', { id, userId });
    }

    async close() {
        await this.channel?.close();
        await this.connection?.close();
    }
}

module.exports = new MessageQueue();

