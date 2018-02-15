const NumberInput = ({id, label, min, max, value, onChange, allowReals, suffix}) => {
    return (
        <p> 
            <label htmlFor={id}>{label}</label>
            <input type="number" id={id} min={min} max={max} step={allowReals ? "any" : "1"}
                   value={value === null ? min : value} onChange={onChange} /> {suffix}
        </p>
    )
}


const formatNumber = (r) => {
    return r.toFixed(2);
}


class BotsComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {roboStats: new Robots({cargoUpgrades: 0, speedUpgrades: 0})};
    }

    upgradesChanged(roboStats) {
        this.setState({roboStats});
    }

    render() {
        return (
            <div>
                <RobotUpgradesComponent onChange={this.upgradesChanged.bind(this)} />
                <ThroughputComponent itemsPerMeterSecond={this.state.roboStats.singleBotMeterThroughput} />
            </div>
        );
    }
}


class RobotUpgradesComponent extends React.Component {
    constructor(props) {
        super(props);
        this.onChange = props.onChange || (() => {});
        this.state = {
            cargoUpgrades: props.cargoUpgrades || 0,
            speedUpgrades: props.speedUpgrades || 0,
        };
    }

    cargoUpgradesChanged(event) {
        this.setState({
            cargoUpgrades: parseInt(event.target.value),
        });
    }

    speedUpgradesChanged(event) {
        this.setState({
            speedUpgrades: parseInt(event.target.value),
        });
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.cargoUpgrades != this.state.cargoUpgrades ||
            prevState.speedUpgrades != this.state.speedUpgrades) {
            this.onChange(new Robots(this.state));
        }
    }

    render() {
        const roboStats = new Robots(this.state);
        return (
            <div id="robot_params">
                <p className="head"></p>

                <NumberInput id="cargo_upgrades" min="0" max="3" value={this.state.cargoUpgrades}
                            label="Cargo size upgrades level: " onChange={this.cargoUpgradesChanged.bind(this)} />
                <NumberInput id="speed_upgrades" min="0" max="100" value={this.state.speedUpgrades}
                            label="Speed upgrades level: " onChange={this.speedUpgradesChanged.bind(this)} />
                <ul>
                    <li>Speed: <b>{formatNumber(roboStats.speed)}</b>m/s</li>
                    <li>Air time before recharge needed: <b>{formatNumber(roboStats.timeUntilRecharge)}</b> s</li>
                    <li>Distance before recharge needed: <b>{formatNumber(roboStats.distanceUntilRecharge)}</b> m</li>
                    <li>Cargo size: <b>{roboStats.cargoSize}</b></li>
                    <li>Single bot throughput (ignoring recharge): <b>{formatNumber(roboStats.singleBotMeterThroughput)}</b> items*m/s</li>
                </ul>
            </div>
        );
    }
}


class ThroughputComponent extends React.Component {
    constructor(props) {
        super(props);
        const stats = new ThroughputStats({travelDistance: 1, botCount: 1, ...props});
        this.state = {
            itemsPerMeterSecond: props.itemsPerMeterSecond,
            travelDistance: stats.travelDistance || stats.forTravelDistance(),
            botCount: stats.botCount || stats.forBotCount(),
            throughput: stats.throughput || stats.forThroughput(),
        }
    }

    componentWillReceiveProps(nextProps) {
        this.setState((prevState) => {
            const stats = new ThroughputStats({...prevState, ...nextProps});
            return {
                itemsPerMeterSecond: nextProps.itemsPerMeterSecond,
                travelDistance: stats.travelDistance || stats.forTravelDistance(),
                botCount: stats.botCount || stats.forBotCount(),
                throughput: stats.forThroughput(),
            }
        });
    }

    render() {
        return (
            <div id="throughput_params">
                <NumberInput id="travel_distance" min="1" max="10000" value={this.state.travelDistance}
                            label="Travel distance: " onChange={this.travelDistanceChanged.bind(this)} />
                <NumberInput id="bot_count" min="1" max="100000" value={this.state.botCount}
                            label="Number of bots: " onChange={this.botCountChanged.bind(this)} />
                <NumberInput id="throughput" min="0" max="1000000" value={this.state.throughput} allowReals={true}
                            label="Throughput (one way): " onChange={this.throughputChanged.bind(this)} suffix="items/sec"/>
                <NumberInput id="throughput" min="0" max="1000000" value={0.5*this.state.throughput} allowReals={true}
                            label="Throughput (return): " onChange={this.throughput2Changed.bind(this)} suffix="items/sec"/>
            </div>
        );
    }

    travelDistanceChanged(event) {
        const travelDistance = parseFloat(event.target.value);
        this.setState((ps) => {
            const stats = new ThroughputStats({...ps, travelDistance});
            return {
                travelDistance,
                throughput: stats.forThroughput(),
            };
        });
    }

    botCountChanged(event) {
        const botCount = parseInt(event.target.value);
        this.setState((ps) => {
            const stats = new ThroughputStats({...ps, botCount});
            return {
                botCount,
                throughput: stats.forThroughput(),
            };
        });
    }

    throughputChanged(event) {
        this._throughputChanged(event);
    }

    throughput2Changed(event) {
        this._throughputChanged(event, 2);
    }

    _throughputChanged(event, multiplier) {
        const throughput = multiplier * parseFloat(event.target.value);
        this.setState((ps) => {
            const stats = new ThroughputStats({...ps, throughput});
            return {
                throughput,
                botCount: stats.forBotCount(),
            };
        });
    }
}


class Robots {
    baseSpeed = 3.0;  // m/s
    energyBeforeCharge = 1100;  // kJ

    constructor({cargoUpgrades, speedUpgrades}) {
        this.speed = this.baseSpeed * this._getSpeedMultiplier(speedUpgrades);
        // E = 5*S + 3*t = 5*V*t + 3*t => t = E/(5*V + 3)
        this.timeUntilRecharge = this.energyBeforeCharge / (5.0 * this.speed + 3.0);
        this.distanceUntilRecharge = this.speed * this.timeUntilRecharge;

        this.cargoSize = cargoUpgrades + 1;
        this.singleBotMeterThroughput = this.cargoSize * this.speed;
    }

    _getSpeedMultiplier(speedUpgrades) {
        switch (speedUpgrades) {
            case 0: return 1.00;
            case 1: return 1.35;
            case 2: return 1.75;
            case 3: return 2.20;
            case 4: return 2.75;
            case 5: return 3.40;
            default: return 3.40 + 0.65*(speedUpgrades - 5);
        }
    }
}


class ThroughputStats {
    constructor({itemsPerMeterSecond, travelDistance, botCount, throughput}) {
        this.itemsPerMeterSecond = itemsPerMeterSecond;
        this.travelDistance = travelDistance;
        this.botCount = botCount;
        this.throughput = throughput;
    }

    forThroughput() {
        return this.itemsPerMeterSecond * this.botCount / this.travelDistance;
    }

    forTravelDistance() {
        return this.itemsPerMeterSecond * this.botCount / this.throughput;
    }

    forBotCount() {
        return this.throughput * this.travelDistance / this.itemsPerMeterSecond;
    }
}


class RechargeStats {
    constructor({robots}) {
    }
}
