import React from 'react';
import { Box, Button, Typography } from '@mui/material';

const OTPComponent = ({ address, otpCode }) => {
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" p={2} border={1} borderColor="grey.300">
      {/* 左上角显示地址 */}
      <Typography variant="body1" component="div">
        {address}
      </Typography>

      {/* 中间突出显示六位数字 */}
      <Typography variant="h3" component="div" textAlign="center">
        {otpCode}
      </Typography>

      {/* 右边显示方形按钮 */}
      <Button variant="contained" color="primary">
        按钮
      </Button>
    </Box>
  );
};

export default OTPComponent;
