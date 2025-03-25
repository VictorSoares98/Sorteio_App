import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Script para migrar dados de afiliação existentes para o novo formato
 */
export const migrateAffiliations = async () => {
  try {
    // Buscar todos os usuários que têm afiliação
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('affiliatedToId', '!=', null));
    const querySnapshot = await getDocs(q);
    
    console.log(`Encontrados ${querySnapshot.size} usuários com afiliação para migrar`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const userDoc of querySnapshot.docs) {
      try {
        const userData = userDoc.data();
        const affiliatedToId = userData.affiliatedToId;
        
        // Ignorar se já tem as informações completas
        if (userData.affiliatedToInfo) continue;
        
        // Buscar dados do afiliador
        const affiliatorDoc = await getDoc(doc(db, 'users', affiliatedToId));
        
        if (!affiliatorDoc.exists()) {
          console.warn(`Afiliador ${affiliatedToId} não encontrado para o usuário ${userDoc.id}`);
          continue;
        }
        
        const affiliatorData = affiliatorDoc.data();
        
        // Atualizar o usuário com as novas informações
        await updateDoc(doc(db, 'users', userDoc.id), {
          affiliatedToEmail: affiliatorData.email,
          affiliatedToInfo: {
            id: affiliatedToId,
            displayName: affiliatorData.displayName,
            email: affiliatorData.email,
            congregation: affiliatorData.congregation || '',
            photoURL: affiliatorData.photoURL || ''
          }
        });
        
        successCount++;
      } catch (err) {
        console.error(`Erro ao migrar usuário ${userDoc.id}:`, err);
        errorCount++;
      }
    }
    
    console.log(`Migração concluída: ${successCount} sucesso, ${errorCount} erros`);
    return { success: successCount, errors: errorCount };
    
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    throw error;
  }
};
