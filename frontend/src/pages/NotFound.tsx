import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound(): JSX.Element {
  return (
    <div>
      <h1>404 — Not Found</h1>
      <p>Stranica koju tražiš ne postoji.</p>
      <p>
        Vrati se na <Link to="/">početnu</Link>.
      </p>
    </div>
  );
}