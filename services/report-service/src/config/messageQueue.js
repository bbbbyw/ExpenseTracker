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
        console.log('Report Service connected to RabbitMQ');
        return this.channel;
    }
}

module.exports = new MessageQueue();

