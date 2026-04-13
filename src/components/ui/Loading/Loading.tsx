import "./Loading.css";
import hhLogo from "../../../assets/hh.png";

const Loading = () => {
  return (
    <div className="loadingContainer">
      <img src={hhLogo} alt="Hayley's Herd" className="loadingLogo" />

      <p className="loadingText">...loading pigs...</p>
    </div>
  );
};

export default Loading;
