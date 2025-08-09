import React from "react";
import Lottie from "lottie-react";
import HeartAnimation from './heart.json'
import Heart2Animation from './heart2.json'


const Footer = () => {
    return (
        <footer className="bg-white py-6 w-full border-0">
            <div className="flex flex-col items-center justify-center w-full h-20 relative">
            <div className="font-medium text-foreground/70 flex items-center -space-x-4">Made with <Lottie animationData={HeartAnimation} loop={true} className="w-14 p-0 m-0" /> by DEVS REC</div>
            {/* <Lottie animationData={Heart2Animation} loop={true} className="absolute w-14 -top-20t-1/2 -translate-x-1/2"/>  */}
        </div>
        </footer>
    )
}

export default Footer