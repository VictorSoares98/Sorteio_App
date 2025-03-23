import { ref } from 'vue';

export function useFormValidation() {
  const errors = ref<Record<string, string>>({});
  
  const validateFormField = (field: string, value: string, validators: Record<string, (value: string) => boolean>) => {
    for (const [errorMessage, validator] of Object.entries(validators)) {
      if (!validator(value)) {
        errors.value[field] = errorMessage;
        return false;
      }
    }
    
    delete errors.value[field];
    return true;
  };
  
  const isFormValid = () => Object.keys(errors.value).length === 0;
  
  return {
    errors,
    validateFormField,
    isFormValid
  };
}