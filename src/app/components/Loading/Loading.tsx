"use client";

import preloader from '../../assets/preloader.gif'
import './Loading.scss'

export const Loading = () =>{
    return <img src={preloader.src} alt='preloader' className='preloader'></img>
}