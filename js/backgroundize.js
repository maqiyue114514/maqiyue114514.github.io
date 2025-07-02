// 设置固定背景
const bgImage = "url('/images/bg.jpg')";
document.querySelector('#web_bg').style.cssText = `
  background-image: ${bgImage};
  position: fixed;
  width: 100%;
  height: 100%;
  z-index: -1;
  background-size: cover;
`;

// 清除banner原有背景
document.querySelector("#banner").style.backgroundImage = "none";
document.querySelector("#banner .mask").style.backgroundColor = "rgba(0,0,0,0)";