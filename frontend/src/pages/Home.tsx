import React from 'react';
import { useNotifications } from '../lib/notifications'

export default function Home(): JSX.Element {
  const { push } = useNotifications()

  const handleNormal = () => {
    push('Uspjeh: podaci su spremljeni. Možete nastaviti s radom ili pregledati zapise u dokumentima.')
  }

  const handleError = () => {
    const longErr = 'Greška: prilikom obrade zahtjeva dogodio se neočekivani problem s vezom i dijelom podataka. Molimo provjerite mrežnu vezu, pokušajte ponovno ili kontaktirajte podršku ako problem potraje.'
    push(longErr, undefined, true)
  }

  return (
    <div>
      <h1>Home</h1>
      <p>Dobrodošao na Poligon — početna stranica aplikacije.</p>
      <p>Koristi navigaciju gore za pristup profilima, dokumentima i ostalim stranicama.</p>
      <div style={{marginTop:16, display:'flex', gap:8}}>
        <button className="btn btn-primary" onClick={handleNormal}>Prikaži notifikaciju (normalna)</button>
        <button className="btn btn-ghost" onClick={handleError}>Prikaži notifikaciju (error)</button>
      </div>
    </div>
  );
}