/**
 * Helpers para simular interações de usuário em testes
 */
import { VueWrapper } from '@vue/test-utils';

/**
 * Simula as interações de um usuário com a interface
 */
export const simulateUser = {
  /**
   * Preenche um formulário com os valores especificados
   * 
   * @param wrapper Wrapper do componente Vue
   * @param formData Dados do formulário a serem preenchidos
   */
  async fillForm(wrapper: VueWrapper<any>, formData: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(formData)) {
      const input = wrapper.find(`[name="${field}"]`);
      if (input.exists()) {
        await input.setValue(value);
      } else {
        console.warn(`Campo ${field} não encontrado no formulário`);
      }
    }
  },
  
  /**
   * Clica no botão de envio do formulário
   * 
   * @param wrapper Wrapper do componente Vue
   * @param submitSelector Seletor para o botão de envio (padrão: botão com type="submit")
   */
  async clickSubmit(wrapper: VueWrapper<any>, submitSelector: string = 'button[type="submit"]'): Promise<void> {
    const submitButton = wrapper.find(submitSelector);
    if (submitButton.exists()) {
      await submitButton.trigger('click');
    } else {
      throw new Error(`Botão de submissão não encontrado com o seletor: ${submitSelector}`);
    }
  },
  
  /**
   * Espera por uma condição ser satisfeita no componente
   * 
   * @param checkFn Função que verifica alguma condição
   * @param timeout Tempo máximo de espera em ms (padrão: 1000ms)
   * @param interval Intervalo entre verificações (padrão: 50ms)
   */
  async waitFor(checkFn: () => boolean, timeout: number = 1000, interval: number = 50): Promise<void> {
    const startTime = Date.now();
    
    return new Promise<void>((resolve, reject) => {
      const check = () => {
        if (checkFn()) {
          resolve();
          return;
        }
        
        if (Date.now() - startTime >= timeout) {
          reject(new Error(`Timeout: condição não satisfeita em ${timeout}ms`));
          return;
        }
        
        setTimeout(check, interval);
      };
      
      check();
    });
  }
};
