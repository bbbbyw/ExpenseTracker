const amqp = require('amqplib');

class MessageQueue {
    constructor() {
        this.connection = null;
        this.channel = null;
    }
    async connect(retries = 10, delay = 3000) {
        if (this.channel) return this.channel;
        
        for (let i = 0; i < retries; i++) {
            try {
                this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
                this.channel = await this.connection.createChannel();
                await this.channel.assertExchange('expense_events', 'topic', { durable: true });
                console.log('Report Service connected to RabbitMQ');
                return this.channel;
            } catch (error) {
                if (i === retries - 1) throw error;
                console.log(`RabbitMQ connection failed, retrying in ${delay}ms... (${i + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

module.exports = new MessageQueue();

