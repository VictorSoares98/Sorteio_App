import { ref } from 'vue';

export function useFormValidation() {
  const errors = ref<Record<string, string>>({});
  
  const validateFormField = <T>(field: string, value: T, validators: Record<string, (value: T) => boolean>) => {
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