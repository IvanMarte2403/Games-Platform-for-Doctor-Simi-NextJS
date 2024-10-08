import React, { useState, useEffect } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { auth, db } from "../../lib/firebase";
import { doc, getDocs, collection, query, where, getDoc, setDoc, orderBy } from "firebase/firestore";
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function DashboardComponent() {
  const [racha, setRacha] = useState(0);
  const [user, setUser] = useState(null);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [totalScore, setTotalScore] = useState(0);
  const [progressGames, setTotalProgress] = useState(0);
  const [trofeos, setTrofeos] = useState([]); // Estado para los trofeos del usuario
  const [rankingPosition, setRankingPosition] = useState(0); // Estado para la posición en el ranking

  useEffect(() => {
    const fetchScoresAndRacha = async () => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          setUser(user);

          // Verificar y actualizar el campo "trofeos" en Firebase
          const stadisticsDocRef = doc(db, "stadistics", user.uid);
          const stadisticsDoc = await getDoc(stadisticsDocRef);

          if (!stadisticsDoc.exists() || !stadisticsDoc.data().trofeos) {
            const initialTrofeos = ["medal1"];
            await setDoc(stadisticsDocRef, { trofeos: initialTrofeos }, { merge: true });
            setTrofeos(initialTrofeos);
          } else {
            setTrofeos(stadisticsDoc.data().trofeos);
          }

          const scoresDoc = await getDocs(collection(db, "scores", user.uid, "sessions"));

          let sumScore = 0;
          if (!scoresDoc.empty) {
            scoresDoc.forEach((doc) => {
              sumScore += Object.values(doc.data()).reduce((acc, curr) => acc + (typeof curr === "number" ? curr : 0), 0);
            });
          }

          setTotalScore(sumScore);
          const calculatedProgress = parseFloat(((sumScore * 100) / 20000).toFixed(1));
          setTotalProgress(calculatedProgress);

          // Calcular la posición en el ranking
          const usersCollectionRef = collection(db, "users");
          const usersQuery = query(usersCollectionRef, orderBy("score_total", "desc"));
          const usersSnapshot = await getDocs(usersQuery);

          let position = 1;
          usersSnapshot.forEach((doc) => {
            if (doc.id === user.uid) {
              setRankingPosition(position);
            } else {
              position++;
            }
          });

          const sessionsCollectionRef = collection(db, "scores", user.uid, "sessions");
          const today = new Date();
          const twoMonthsAgo = new Date(today);
          twoMonthsAgo.setMonth(today.getMonth() - 2);

          const sessionsQuery = query(
            sessionsCollectionRef,
            where("timestamp", ">=", twoMonthsAgo),
            where("timestamp", "<", today)
          );

          const querySnapshot = await getDocs(sessionsQuery);

          if (!querySnapshot.empty) {
            let consecutiveDays = 0;
            let currentDate = new Date(today);
            currentDate.setDate(currentDate.getDate() - 1);

            const sessionDates = new Set();
            const labels = [];
            const scores = [];

            querySnapshot.forEach((doc) => {
              const sessionDate = doc.data().timestamp.toDate();
              const score = doc.data().score;

              sessionDates.add(sessionDate.toDateString());

              labels.push(sessionDate.toLocaleDateString());
              scores.push(score);
            });

            setChartData({
              labels: labels,
              datasets: [
                {
                  label: 'Rendimiento de puntaje',
                  data: scores,
                  fill: false,
                  borderColor: '#e15759',
                  tension: 0.1
                }
              ]
            });

            while (sessionDates.has(currentDate.toDateString()) && consecutiveDays < 60) {
              consecutiveDays++;
              currentDate.setDate(currentDate.getDate() - 1);
            }

            const newRacha = consecutiveDays;
            setRacha(newRacha);
          } else {
            setRacha(0);
            setChartData({
              labels: ["No data"],
              datasets: [
                {
                  label: 'Score Over Time',
                  data: [0],
                  fill: false,
                  borderColor: '#e15759',
                  tension: 0.1
                }
              ]
            });
          }
        }
      });

      return () => unsubscribe();
    };

    fetchScoresAndRacha();
  }, []);

  const getKnowledgeLevelInfo = () => {
    if (totalScore >= 20000) {
      return {
        imagePath: "img/levels/Level5.png",
        title: "Gran Maestro",
        description: "Has alcanzado el nivel más alto de conocimiento, dominando múltiples áreas del saber."
      };
    } else if (totalScore >= 10000) {
      return {
        imagePath: "img/levels/Level4.png",
        title: "Erudito",
        description: "Tienes un amplio conocimiento en varios campos y sigues creciendo en sabiduría."
      };
    } else if (totalScore >= 7500) {
      return {
        imagePath: "img/levels/Level3.png",
        title: "Experto",
        description: "Tu conocimiento es profundo en muchas áreas, siendo una referencia para los demás."
      };
    } else if (totalScore >= 5000) {
      return {
        imagePath: "img/levels/Level2.png",
        title: "Aficionado",
        description: "Has demostrado un buen nivel de conocimiento en temas variados, pero aún hay espacio para aprender."
      };
    } else if (totalScore >= 2500) {
      return {
        imagePath: "img/levels/Level1.png",
        title: "Estudiante",
        description: "Estás en el camino del aprendizaje, adquiriendo conocimientos nuevos cada día."
      };
    } else {
      return {
        imagePath: "img/levels/level0.png",
        title: "Principiante",
        description: "Estás comenzando tu viaje en el conocimiento. ¡Sigue adelante y aprenderás mucho más!"
      };
    }
  };
  const { imagePath, title, description } = getKnowledgeLevelInfo();

  const pieChartData = {
    labels: ["SIMI INVADE", "SIMI RUN", "SIMI SLASH", "SIMI SPACE"],
    datasets: [
      {
        data: [3000, 5000, 2000, 10000],
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
        hoverBackgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
      },
    },
  };

  return (
    <div className="dashboard-user-container">
      <div className="header">
        <h2>DASHBOARD</h2>
        <div className="container-racha">
          <img src="img/icons/calendar.svg" alt="Calendar Icon" />
          <p>{racha} Días de Racha</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="total-score-container">
          <div>
            <div>
              <h1>Total Score</h1>
            </div>
          </div>
          <h2>{totalScore !== null ? totalScore : 0}</h2>

          <div>
            <p className="score-ranking">#{rankingPosition}</p>             
          </div>
        </div>

        <div className="dashboard-item-mensual">
          <h3>Rendimiento Mensual</h3>
          <div className="monthly-performance">
            <div className="performance-chart">
              <CircularProgressbar 
                value={progressGames} 
                text={`${progressGames.toFixed(1)}%`} 
              />
            </div>
          </div>
        </div>

        <div className="dashboard-item weekly-goal">
          <h3>Meta Semanal</h3>
          <p>20000</p>
          <div className="graft-ranking">
            <Line data={chartData} options={{ scales: { x: { grid: { color: '#ffffff' } }, y: { grid: { color: '#ffffff' } } } }} />
          </div>
        </div>
      </div>

      <div className="dashboard-content2">
        <div className="dashboard-item knowledge-level">
          <div className="knowledge-level-text">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <img src={imagePath} alt={title} className="knowledge-level-image" />
        </div>

        <div className="knowledge-level-chart dashboard-item">
          <h4>Distribución de puntos por juego</h4>
          <div className="pie-chart-container">
            <Doughnut data={pieChartData} options={pieChartOptions} />
          </div>
        </div>
      </div>

      <div className="dashboard-content3">
        <div className="dashboard-item score-coins">
          <div className="score-title">
            <img src="img/icons/trofeo.svg" />
            <p>10,000</p>
          </div>

          <div className="trofeos-container">
            {trofeos.map((trofeo, index) => (
              <div key={index} className="trofeo">
                <img src={`img/medallas/${trofeo}.svg`} alt={`Trofeo ${index + 1}`} />
                <h3>...</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
