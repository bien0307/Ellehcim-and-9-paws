import React from 'react';
import { DogProfile } from '../game/types';

interface DogBadgeIconProps {
  dog: DogProfile;
  found?: boolean;
  size?: number;
}

export const DogBadgeIcon: React.FC<DogBadgeIconProps> = ({
  dog,
  found = true,
  size = 36,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-label={dog.name}
      className={found ? 'opacity-100' : 'opacity-45 grayscale'}
    >
      <circle
        cx="20"
        cy="20"
        r="18"
        fill={found ? '#26392D' : '#18241C'}
        stroke={found ? dog.collarColor : '#3E5245'}
        strokeWidth="2"
      />

      {/* Ears */}
      {dog.earStyle === 'pointed' && (
        <>
          <polygon points="10,16 13,6 18,13" fill={dog.coatColor} stroke="#1B1512" strokeWidth="1.2" />
          <polygon points="30,16 27,6 22,13" fill={dog.coatColor} stroke="#1B1512" strokeWidth="1.2" />
        </>
      )}
      {dog.earStyle === 'beagle' && (
        <>
          <ellipse cx="10" cy="21" rx="3.4" ry="7" transform="rotate(10 10 21)" fill="#6D3C1E" stroke="#1B1512" strokeWidth="1.2" />
          <ellipse cx="30" cy="21" rx="3.4" ry="7" transform="rotate(-10 30 21)" fill="#6D3C1E" stroke="#1B1512" strokeWidth="1.2" />
        </>
      )}
      {dog.earStyle === 'fluffy' && (
        <>
          <circle cx="12" cy="15" r="4.5" fill={dog.coatColor} stroke="#1B1512" strokeWidth="1.2" />
          <circle cx="28" cy="15" r="4.5" fill={dog.coatColor} stroke="#1B1512" strokeWidth="1.2" />
        </>
      )}
      {(dog.earStyle === 'border' || dog.earStyle === 'perky' || dog.earStyle === 'terrier') && (
        <>
          <ellipse
            cx="12"
            cy="15"
            rx="3.5"
            ry="5.5"
            transform="rotate(20 12 15)"
            fill={dog.leftFaceMaskColor ?? dog.coatColor}
            stroke="#1B1512"
            strokeWidth="1.2"
          />
          <ellipse
            cx="28"
            cy="15"
            rx="3.5"
            ry="5.5"
            transform="rotate(-20 28 15)"
            fill={dog.spotColor ?? dog.coatColor}
            stroke="#1B1512"
            strokeWidth="1.2"
          />
        </>
      )}

      {/* Fluffy cheeks for Julie */}
      {dog.chubby && (
        <>
          <circle cx="14" cy="24" r="5.5" fill={dog.secondaryColor} />
          <circle cx="26" cy="24" r="5.5" fill={dog.secondaryColor} />
        </>
      )}

      {/* Head */}
      <circle
        cx="20"
        cy="21"
        r={dog.chubby ? 9.5 : 8.8}
        fill={dog.coatColor}
        stroke="#1B1512"
        strokeWidth="1.3"
      />

      {/* Spotty: unique brown mask on the left side of her face + brown spot */}
      {dog.leftFaceMaskColor && (
        <>
          <path
            d="M20,12.3 A8.7,8.7 0 0,0 11.8,24.2 Q16.2,23.5 18.6,19.2 Q19.8,16 20,12.3 Z"
            fill={dog.leftFaceMaskColor}
          />
          <circle cx="25.5" cy="18" r="2.1" fill={dog.spotColor ?? '#8C5230'} opacity="0.9" />
        </>
      )}

      {/* Muzzle */}
      <ellipse
        cx="20"
        cy="24.5"
        rx={dog.chubby ? 4.2 : 5}
        ry="3.6"
        fill={dog.id === 'spotty' ? dog.coatColor : dog.secondaryColor}
      />

      {/* Nose (Spikey gets a big black nose; Julie gets a small nose) */}
      <circle
        cx="20"
        cy="23.5"
        r={dog.bigNose ? 3.2 : dog.id === 'julie' ? 1.5 : 2.1}
        fill={dog.noseColor}
      />

      {/* Eyes (supports heterochromia like Scoob's blue left & yellow right eye) */}
      {dog.leftEyeColor && dog.rightEyeColor ? (
        <>
          <circle cx="16.2" cy="19.5" r="2.1" fill={dog.leftEyeColor} stroke="#181412" strokeWidth="0.6" />
          <circle cx="16.2" cy="19.5" r="0.95" fill="#181412" />
          <circle cx="23.8" cy="19.5" r="2.1" fill={dog.rightEyeColor} stroke="#181412" strokeWidth="0.6" />
          <circle cx="23.8" cy="19.5" r="0.95" fill="#181412" />
        </>
      ) : (
        <>
          <circle cx="16.5" cy="19.5" r="1.4" fill="#181412" />
          <circle cx="23.5" cy="19.5" r="1.4" fill="#181412" />
        </>
      )}

      {/* Golden floating halo for Sunny */}
      {dog.hasHalo && (
        <ellipse
          cx="20"
          cy="7.5"
          rx="6.8"
          ry="2.2"
          fill="none"
          stroke="#FFD85C"
          strokeWidth="2.1"
        />
      )}

      {/* Feisty brow for Potato */}
      {dog.id === 'potato' && (
        <>
          <line x1="14.5" y1="16.5" x2="18" y2="17.8" stroke="#3B2314" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="25.5" y1="16.5" x2="22" y2="17.8" stroke="#3B2314" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
};
