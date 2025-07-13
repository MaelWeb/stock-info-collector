import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

/**
 * @description 现代化加载组件
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'default',
  text = '加载中...',
  fullScreen = false,
  className = '',
}) => {
  const antIcon = (
    <LoadingOutlined
      style={{ fontSize: size === 'large' ? 32 : size === 'small' ? 16 : 24 }}
      spin
    />
  );

  if (fullScreen) {
    return (
      <div className={`loading-fullscreen ${className}`}>
        <Spin
          indicator={antIcon}
          size={size}
        />
        {text && <div className='loading-text'>{text}</div>}
      </div>
    );
  }

  return (
    <div className={`loading-container ${className}`}>
      <Spin
        indicator={antIcon}
        size={size}
      />
      {text && <div className='loading-text'>{text}</div>}
    </div>
  );
};

export default LoadingSpinner;
