import React, { useState } from "react";
import { Header, Role } from "../components/Header";
import { useSession } from "../hooks/useSession";


function App() {
  const { session, role, loading } = useSession();
  


  if (loading) return <div>Loading...</div>;
  return (
    <>
      <Header role={role} />
      {/* ...rest of your app */}
    </>
  );
}

export default App;