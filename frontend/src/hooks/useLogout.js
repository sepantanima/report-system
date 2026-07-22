import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export default function useLogout() {
  const navigate = useNavigate();

  return useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);
}
