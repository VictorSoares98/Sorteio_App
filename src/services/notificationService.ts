import emailjs from '@emailjs/browser';

// Configurar ids do EmailJS
const SERVICE_ID = 'seu_service_id';
const TEMPLATE_ID = 'seu_template_id';
const PUBLIC_KEY = 'sua_chave_publica';

// Inicialização
emailjs.init(PUBLIC_KEY);

interface NotificationParams {
  recipient: string;
  subject: string;
  message: string;
  eventType?: string;
}

export async function sendNotification({ 
  recipient, 
  subject, 
  message,
  eventType = 'system_alert'
}: NotificationParams): Promise<boolean> {
  try {
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: recipient,
      subject: subject,
      message: message,
      event_type: eventType,
      date: new Date().toLocaleString()
    });

    console.log('Notificação enviada:', response.status);
    return true;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return false;
  }
}
