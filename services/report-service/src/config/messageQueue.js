const amqp = require('amqplib');

class MessageQueue {
    constructor() {
        this.connection = null;
        this.channel = null;
    }
    async connect(retries = 10, delay = 3000) {
        if (this.channel) return this.channel;
        
        // Construct RabbitMQ URL from env vars if RABBITMQ_URL not set
        let rabbitmqUrl = process.env.RABBITMQ_URL;
        if (!rabbitmqUrl && process.env.RABBITMQ_USER && process.env.RABBITMQ_PASSWORD) {
            rabbitmqUrl = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@rabbitmq:5672`;
        }
        if (!rabbitmqUrl) {
            rabbitmqUrl = 'amqp://localhost';
        }
        
        for (let i = 0; i < retries; i++) {
            try {
                this.connection = await amqp.connect(rabbitmqUrl);
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

