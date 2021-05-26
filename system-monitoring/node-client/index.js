const os = require('os');
const io = require('socket.io-client');
const socket = io('http://127.0.0.1:8181');
const Constants = require('./constants');

socket.on('connect', () => {
  const networkInterface = os.networkInterfaces();
  let macAddress;
  for (let key in networkInterface) {
    if (process.env.NODE_ENV === 'test') {
      macAddress = Math.floor(Math.random() * 3) + 1;
      break;
    } else {
      if (!networkInterface[key][0].internal) {
        networkInterface[key][0].mac === Constants.NO_MAC_ADDRESS
          ? (macAddress = Math.random().toString(36).substr(2, 15))
          : (macAddress = networkInterface[key][0].mac);
        break;
      }
    }
  }

  performanceData().then((allPerformanceData) => {
    socket.emit('initPerfData', { ...allPerformanceData, macA: macAddress });
    socket.emit('clientAuth', Constants.APP_KEY);
  });

  let perfDataInterval = setInterval(() => {
    performanceData().then((allPerformanceData) => {
      socket.emit('perfData', { ...allPerformanceData, macA: macAddress });
    });
  }, 1000);

  socket.on('disconnect', () => {
    clearInterval(perfDataInterval);
  });
});

async function performanceData() {
  return new Promise(async (resolve, reject) => {
    const osType = (os.type() === 'Darwin' ? Constants.MAC : os.type()) === 'Windows_NT' ? Constants.WINDOWS : os.type();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = Math.floor((usedMem / totalMem) * 100) / 100;
    const upTime = os.uptime();
    const cpuModel = os.cpus()[0].model;
    const numCores = os.cpus().length;
    const cpuSpeed = os.cpus()[0].speed;
    const cpuLoad = await getCpuLoad();
    const isActive = true;

    resolve({ osType, totalMem, freeMem, usedMem, memUsage, upTime, cpuModel, numCores, cpuSpeed, cpuLoad, isActive });
  });
}

function cpuAverage() {
  const cpus = os.cpus();
  let idleMs = 0;
  let totalMs = 0;
  cpus.forEach((core) => {
    for (type in core.times) {
      totalMs += core.times[type];
    }
    idleMs += core.times.idle;
  });
  return {
    idle: idleMs / cpus.length,
    total: totalMs / cpus.length,
  };
}

function getCpuLoad() {
  return new Promise((resolve, reject) => {
    const start = cpuAverage();
    setTimeout(() => {
      const end = cpuAverage();
      const idleDifference = end.idle - start.idle;
      const totalDifference = end.total - start.total;
      resolve(100 - Math.floor((100 * idleDifference) / totalDifference));
    }, 100);
  });
}
