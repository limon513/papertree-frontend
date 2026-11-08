/**
 * The shopper's details, remembered on this device after an order or a product request, so next time
 * the forms are already filled in. Only in this browser; nothing is sent anywhere until they submit.
 */
const KEY = 'pt-contact';

export interface Contact {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string;
}

export function savedContact(): Contact {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? 'null') as Contact | null) ?? {};
  } catch {
    return {};
  }
}

export function saveContact(contact: Contact) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...savedContact(), ...contact }));
  } catch {
    // Private mode or full storage: not remembered, fine.
  }
}
