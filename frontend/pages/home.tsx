// pages/home.tsx
import { withAuth } from "../utils/withAuth";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";
import { GetServerSideProps } from "next";
import ConnectPage from "./connect"; //
import api from '../lib/api'; 
import { useState ,useEffect} from "react";

const Home = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
        // Fetch user profile when the component mounts
        const fetchProfile = async () => {
            try {
                const response = await api.get('/auth/profile');
                setUser(response.data);
            } catch (error) {
                console.error('Failed to fetch profile:', error);
                // The interceptor will handle token refresh or redirect
            }
        };

        fetchProfile();
    }, []);

    const handleLogout = async () => {
        try {
            await api.post('/auth/Logout');
            // Redirect to login page after successful logout
            router.push('/login');
        } catch (error) {
            console.error('An error occurred during logout:', error);
        }
    };


  return (
    <div className={styles.container}>
      {/* ✅ Header section */}
      <header className={styles.header}>
        <h1 className={styles.logo}>Welcome to your Dashboard!</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout

        </button>
      </header>

      {/* ✅ Main content */}
      <main className={styles.main}>
        <ConnectPage />
      </main>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(async (context) => {
  return { props: {} };
});

export default Home;
