import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

function Login() {

  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try{

      const res = await api.post("/login",{
        username,
        password
      });

      localStorage.setItem("token",res.data.token);

      navigate("/dashboard");

    }catch(err){

      alert("login failed" & err.err);

    }
  }

  return (

    <div style={{padding:"40px"}}>

      <h2>Login</h2>

      <form onSubmit={handleLogin}>

        <input
          placeholder="username"
          value={username}
          onChange={(e)=>setUsername(e.target.value)}
        />

        <br/><br/>

        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <br/><br/>

        <button type="submit">
          Login
        </button>

      </form>

    </div>

  );
}

export default Login;
