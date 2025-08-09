# FROM HOST: Run to enter a container-based development environment.
#   Run with ./dev.sh to watch application files and live update.
CWD=$PWD

# Workspace reset flag 
#    (deletes ./mount in the current directory 
#      which is the default mount in this directory)
if [ -n $RESETWS ]; then
    rm -rf ./mount
fi

# Skip rebuilding the container every time
if [ -z $SKIPBUILD ]; then
    echo "Building container..."
    docker build -t wg-easy-test .
fi

if [ -z "${UNMODIFIED}" ]; then
    echo "Removing built and installed files before starting..."
    rm -rf $CWD/web/node_modules
    rm -rf $CWD/web/dist
    rm -rf $CWD/server/node_modules
fi

# Runs the container just built
echo "Entering environment..."
docker rm -f wg-easy-test
docker run --rm -it \
    --name=wg-easy-test \
    -p 51822:51822/udp \
    -e WG_PORT=51822 \
    -p 51821:51821/tcp \
    -e PORT=51821 \
    -e INSTALL_ALL=true \
    -e DEV_MODE=true \
    -p 5173:5173 \
    -v $PWD:/app \
    -v $PWD/mount/wireguard:/etc/wireguard \
    -e WG_HOST=$(curl checkip.amazonaws.com) \
    --cap-add=NET_ADMIN \
    --cap-add=SYS_MODULE \
    --sysctl=net.ipv4.ip_forward=1 \
    --sysctl=net.ipv4.conf.all.src_valid_mark=1 \
    --sysctl net.ipv6.conf.all.disable_ipv6=0 \
    wg-easy-test $*
#    node:19 $*

# explanations:

# -- ports
# 51822 = Wireguard server listen port
# 51821 = Wireguard GUI server listen port
# associated env to configure these ports to be used are under each port bind

# -- volumes
# $PWD:/app = Mount current directory (development directory) into the container
# $PWD/mount/wireguard = Mount the current directory's mount/wireguard to persist the Wireguard configuration

# -- more env
# WG_HOST=$(curl ...) = get the server's IP

# -- permissions
# cap-add NET_ADMIN & SYS_MODULE = permissions necessary for the Wireguard server
# sysctls = some configuration necessary for a working Wireguard VPN

# -- container misc.
# $* = run whatever arguments passed to this script in the server (e.g. bash)
