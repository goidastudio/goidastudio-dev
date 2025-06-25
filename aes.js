class CryptoJS {
  /**
   * Шифрование текста с поддержкой Unicode
   * @param {string} text - Текст для шифрования
   * @param {string} key - Ключ (любая строка)
   * @return {string} Зашифрованная строка в HEX
   */
  static encrypt(text, key) {
    const textEncoder = new TextEncoder();
    const keyEncoder = new TextEncoder();
    
    const textBytes = textEncoder.encode(text);
    const keyBytes = keyEncoder.encode(key);
    
    const result = new Uint8Array(textBytes.length);
    
    for (let i = 0; i < textBytes.length; i++) {
      result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Дешифрование текста
   * @param {string} encryptedHex - Зашифрованная строка в HEX
   * @param {string} key - Ключ (такой же как при шифровании)
   * @return {string} Расшифрованный текст
   */
  static decrypt(encryptedHex, key) {
    const keyEncoder = new TextEncoder();
    const keyBytes = keyEncoder.encode(key);
    
    const encryptedBytes = new Uint8Array(encryptedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const result = new Uint8Array(encryptedBytes.length);
    
    for (let i = 0; i < encryptedBytes.length; i++) {
      result[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(result);
  }
}
