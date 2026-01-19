const amqp = require('amqplib');

class MessageQueue {
    constructor() {
        this.connection = null;
        this.channel = null;
    }

    async connect(retries = 10, delay = 3000) {
        if (this.channel) return;
        
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
                console.log('Expense Service connected to RabbitMQ');
                return;
            } catch (error) {
                if (i === retries - 1) throw error;
                console.log(`RabbitMQ connection failed, retrying in ${delay}ms... (${i + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
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

