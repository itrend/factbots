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

const zeParseFloat = (s, valueOnEmpty) => {
    return s === "" ? valueOnEmpty : parseFloat(s);
}


class BotsComponent extends React.Component {
    constructor(props) {
        super(props);
        const robots = new Robots({cargoUpgrades: 0, speedUpgrades: 0});
        this.state = {
            roboStats: robots,
            chargingStats: new RechargeStats({robots, chargingDistance: 0}),
        };
    }

    upgradesChanged(roboStats) {
        this.setState({roboStats});
    }

    chargingChanged(chargingStats) {
        this.setState({chargingStats});
    }

    render() {
        return (
            <div>
                <RobotUpgradesComponent onChange={this.upgradesChanged.bind(this)} />
                <ThroughputComponent itemsPerMeterSecond={this.state.chargingStats.singleBotMeterThroughput} />
                <ChargingComponent onChange={this.chargingChanged.bind(this)} robots={this.state.roboStats}/>
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
                            label="Travel distance (one way): " onChange={this.travelDistanceChanged.bind(this)} />
                <NumberInput id="bot_count" min="1" max="100000" value={this.state.botCount}
                            label="Number of bots: " onChange={this.botCountChanged.bind(this)} />
                <NumberInput id="throughput" min="0" max="1000000" value={this.state.throughput} allowReals={true}
                            label="Throughput (one way): " onChange={this.throughputChanged.bind(this)} suffix="items/sec"/>
                <NumberInput id="throughput" min="0" max="1000000" value={0.5*this.state.throughput} allowReals={true}
                            label="Throughput (back-and-forth): " onChange={this.throughput2Changed.bind(this)} suffix="items/sec"/>
            </div>
        );
    }

    travelDistanceChanged(event) {
        this._parseValueAndUpdateState(event, 'travelDistance', 1, (stats, stateUpdate) => { stateUpdate.throughput = stats.forThroughput(); } );
    }

    botCountChanged(event) {
        this._parseValueAndUpdateState(event, 'botCount', 1, (stats, stateUpdate) => { stateUpdate.throughput = stats.forThroughput(); } );
    }

    throughputChanged(event) {
        this._parseValueAndUpdateState(event, 'throughput', null, (stats, stateUpdate) => { stateUpdate.botCount = stats.forBotCount(); });
    }

    throughput2Changed(event) {
        this._parseValueAndUpdateState(event, 'throughput', null, (stats, stateUpdate) => { stateUpdate.botCount = stats.forBotCount(); }, (v) => 2*v);
    }

    _parseValueAndUpdateState(event, stateValueName, valueOnEmpty, updateNewStateFunc, mutatorFunc) {
        const value = zeParseFloat(event.target.value, valueOnEmpty);
        if (value != null && !isNaN(value)) {
            this.setState((ps) => {
                const mvalue = mutatorFunc ? mutatorFunc(mvalue) : value;
                const stateUpdate = {[stateValueName]: mvalue};
                const stats = new ThroughputStats({...ps, ...stateUpdate});
                updateNewStateFunc(stats, stateUpdate);
                return stateUpdate;
            });
        }
    }
}


class ChargingComponent extends React.Component {
    constructor(props) {
        super(props);
        this.onChange = props.onChange || (() => {});
        this.state = {
            chargingDistance: props.chargingDistance || 0,
        }
    }

    componentWillReceiveProps(nextProps) {
        this.setState((prevState) => prevState);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.chargingDistance != this.state.chargingDistance ||
            prevProps.robots.singleBotMeterThroughput != this.props.robots.singleBotMeterThroughput) {
            this.onChange(new RechargeStats({robots: this.props.robots, chargingDistance: this.state.chargingDistance}));
        }
    }

    render() {
        const robots = this.props.robots;
        const stats = new RechargeStats({robots, chargingDistance: this.state.chargingDistance});
        return (
            <div id="throughput_params">
                <NumberInput id="charging_distance" min="0" max="10000" value={this.state.chargingDistance}
                            label="Charging distance (one-way): " onChange={this.chargingDistanceChanged.bind(this)} />
                <ul>
                    <li>{this._renderPhases(stats)}</li>
                    <li>Charging time fraction: <b>{formatNumber(stats.chargingFraction)}</b></li>
                    <li>Expected % of bots charging at a time: <b>{formatNumber(100.0*stats.chargingFraction)}</b></li>
                    <li>Overhead time fraction: <b>{formatNumber(stats.overheadFraction)}</b></li>
                    <li>Single bot throughput (adjusted for recharge): <b>{formatNumber(stats.singleBotMeterThroughput)}</b> items*m/s</li>
                </ul>
            </div>
        );
    }

    _renderPhases(stats) {
        const rows = stats.phases.map((phase, i) => (
            <tr key={i}>
                <td>{phase.name}</td>
                <td>{formatNumber(phase.duration)}</td>
                <td>{phase.energyStart}</td>
                <td>{phase.energyEnd}</td>
            </tr>
        ));
        return (
            <table>
                <tbody>
                    <tr><th>phase</th><th>duration</th><th>starting energy</th><th>final energy</th></tr>
                    {rows}
                    <tr><th>total</th><th>{formatNumber(stats.cycleTime)}</th><td></td><td></td></tr>
                </tbody>
            </table>
        );
    }

    chargingDistanceChanged(event) {
        const chargingDistance = zeParseFloat(event.target.value, 0);
        if (!isNaN(chargingDistance)) {
            this.setState({chargingDistance});
        }
    }
}


class Robots {
    baseSpeed = 3.0;  // m/s
    maxChargeLevel = 1500;  // kJ 
    forceChargeLevel = 300;  // kJ
    energyBeforeCharge = this.maxChargeLevel - this.forceChargeLevel;  // kJ
    roboportChargingPower = 1000;  // kW

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

    energyForDistance(s) {
        return this.energyForDuration(s / this.speed);
    }

    energyForDuration(t) {
        return 5.0 * t * this.speed + 3.0 * t;
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
    constructor({robots, chargingDistance}) {
        this.robots = robots;
        this.chargingDistance = chargingDistance;

        this.chargingTimeForChargeTravel = robots.energyForDistance(chargingDistance) / robots.roboportChargingPower;
        this.chargingTime = this.chargingTimeForChargeTravel + robots.energyBeforeCharge / robots.roboportChargingPower;
        this.chargeTravelTimeOneWay = chargingDistance / robots.speed;
        this.overheadTime = 2.0*this.chargeTravelTimeOneWay + this.chargingTime;
        this.usefulTime = robots.timeUntilRecharge - this.chargeTravelTimeOneWay;
        this.cycleTime = this.overheadTime + this.usefulTime;
        this.overheadFraction = this.overheadTime / this.cycleTime;
        this.chargingFraction = this.chargingTime / this.cycleTime;

        this.phases = [{
            name: 'go-to-work',
            energyStart: robots.maxChargeLevel,
            duration: this.chargeTravelTimeOneWay,
        }, {
            name: 'work',
            duration: this.usefulTime,
        }, {
            name: 'go-to-roboport',
            duration: this.chargeTravelTimeOneWay,
        }, {
            name: 'charging',
            duration: this.chargingTime,
            energyEnd: robots.maxChargeLevel,
        }];

        for (let i=0; i<this.phases.length-1; ++i) {
            const phase = this.phases[i];
            phase.energyEnd = Math.round(phase.energyStart - robots.energyForDuration(phase.duration));
            this.phases[i+1].energyStart = phase.energyEnd;
        }

        this.singleBotMeterThroughput = robots.singleBotMeterThroughput * (1.0 - this.overheadFraction);
    }
}
