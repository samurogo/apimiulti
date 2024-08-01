import amqp from 'amqplib';
import { SaveSensorDataUseCase } from '../application/SaveSensorDataUseCase';
import { Sensor } from '../domain/Sensor';
import { SaveSensorUltrasonicDataUseCase } from '../../sensor/application/sensor/SaveSensorUltrasonicDataUseCase';
import { SensorUltrasonic } from '../../sensor/domain/sensor/SensorUltrasonic';

const amqpUrl = 'amqp://samuel:samuel2004@44.197.73.155:5672';
const queue = 'mqtt';

class RabbitMQService {
  private saveSensorDataUseCase: SaveSensorDataUseCase;
  private saveSensorUltrasonicDataUseCase: SaveSensorUltrasonicDataUseCase;

  constructor(
    saveSensorDataUseCase: SaveSensorDataUseCase,
    saveSensorUltrasonicDataUseCase: SaveSensorUltrasonicDataUseCase
  ) {
    this.saveSensorDataUseCase = saveSensorDataUseCase;
    this.saveSensorUltrasonicDataUseCase = saveSensorUltrasonicDataUseCase;
  }

  async consumeMessages(): Promise<void> {
    try {
      const connection = await amqp.connect(amqpUrl);
      const channel = await connection.createChannel();
      await channel.assertQueue(queue, { durable: true });

      console.log(`Esperando mensajes en la cola ${queue}...`);

      channel.consume(queue, async (message) => {
        if (message !== null) {
          const content = message.content.toString();
          console.log("Mensaje recibido:", content);

          try {
            await this.processMessage(content);
            channel.ack(message);
          } catch (error) {
            console.error('Error al procesar el mensaje:', error);
            channel.nack(message);
          }
        }
      });
    } catch (error) {
      console.error('Error al consumir mensajes:', error);
    }
  }

  private async processMessage(message: string): Promise<void> {
    try {
      if (message.includes('Distancia:')) {
        const distanceMatch = message.match(/Distancia: (\d+) cm/);
        const distance = distanceMatch ? parseInt(distanceMatch[1]) : null;
  
        const tempMatch = message.match(/Temp: ([\d.]+) C/);
        const temperature = tempMatch ? parseFloat(tempMatch[1]) : null;
  
        const humMatch = message.match(/Hum: ([\d.]+) %/);
        const humidity = humMatch ? parseFloat(humMatch[1]) : null;
  
        if (distance !== null && temperature !== null && humidity !== null) {
          const sensorData: Sensor = {
            id: '',
            temperature,
            humidity,
            timestamp: new Date(),
          };
          await this.saveSensorDataUseCase.execute(sensorData);
          console.log('Datos de temperatura y humedad guardados correctamente:', sensorData);
        } else {
          console.error('Datos de sensor incompletos:', { distance, temperature, humidity });
        }
      }
  
      if (message.includes('Movimiento detectado') || message.includes('Sin movimiento')) {
        const distanceMatch = message.match(/Distancia: (\d+) cm/);
        const distance = distanceMatch ? parseInt(distanceMatch[1]) : null;
  
        const motionDetected = message.includes('Movimiento detectado');
  
        if (distance !== null) {
          const sensorUltrasonicData: SensorUltrasonic = {
            id: '',
            distance,
            timestamp: new Date(),
            motionDetected,
          };
          await this.saveSensorUltrasonicDataUseCase.execute(sensorUltrasonicData);
          console.log('Datos de sensor ultrasónico guardados correctamente:', sensorUltrasonicData);
        } else {
          console.error('Datos de sensor ultrasónico incompletos:', { distance, motionDetected });
        }
      }
    } catch (error) {
      console.error('Error al procesar el mensaje:', error);
    }
  }
}

export default RabbitMQService;
