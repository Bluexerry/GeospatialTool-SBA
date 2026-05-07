/* Written by Ye Liu */

import React from 'react';

import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import CircularProgress from '@material-ui/core/CircularProgress';
import Dialog from '@material-ui/core/Dialog';
import Slide from '@material-ui/core/Slide';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import indigo from '@material-ui/core/colors/indigo';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import Autocomplete from '@material-ui/lab/Autocomplete';
import axios from 'axios';
import emitter from '@utils/events.utils';
import { AUTH_API_URL, DATA_API_URL } from '@/config';

// Local mutable map: catastral_ref → { data: geojson }
const datasets = {};

// Each axios call specifies a full URL — no global baseURL to avoid conflicts.

const theme = createTheme({
    palette: {
        primary: {
            main: indigo.A200
        }
    }
});

const catastralList = ["41046A010000100000DU","41041A014001860000HF","41041A014001790000HQ", "41041A015002920000HF", "41041A015002760000HH", "41041A015002730000HS", "41041A014000920000HF", "41041A007003790000HK", "41041A005000430000HO"];

axios.interceptors.request.use(
    config => {
      try {
        const { origin } = new URL(config.url);
        const allowedOrigins = [AUTH_API_URL, DATA_API_URL];
        const token = localStorage.getItem('token');
        if (allowedOrigins.includes(origin) && token) {
          config.headers.authorization = `Bearer ${token}`;
        }
      } catch (_) { /* relative URLs – skip */ }
      return config;
    },
    error => Promise.reject(error)
  );

const styles = {
    loginContainer: {
        width: 300,
        height: 350,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        marginBottom: 20
    },
    inputBox: {
        width: 240,
        marginTop: 15
    },
    autocomplete: {
        width: 240,       
        display: 'flex',
        flexWrap: 'wrap',
        overflow: 'auto',
    },
    checkBox: {
        width: 140
    },
    loginBtnContainer: {
        display: 'inline-block',
        position: 'relative'
    },
    loginBtn: {
        width: 120,
        marginTop: 20
    },
    loginBtnProgress: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -3,
        marginLeft: -12,
    }
};



const Transition = React.forwardRef((props, ref) => {
    return <Slide direction="down" ref={ref} {...props} />;
});

class Login extends React.Component {
    state = {
        open: false,
        remember: false,
        logining: false,
        mode: 'login',
        selectedOptions:[],
        datasets:{}
    }

    handleLoginClose = () => {
        this.setState({
            open: false
        });
    }

    handleRememberChange = (e) => {
        this.setState({
            remember: e.target.checked
        });
    }

    handleChangeForm = (e) => {
        this.setState({
            mode: this.state.mode === 'login' ? 'Login' : 'Register'
        });
        console.log(this.state.mode)
    }

    handleChangeAutoComplete = (e, newValue) => {
        const updatedReferences = newValue.map(option => option.reference);
        this.setState({ selectedOptions: updatedReferences }, () => {
            console.log(this.state.selectedOptions);  // This will now output the updated state
          });
    };

    getUserParcels = async (userId) => {
        try {
            const response = await axios.get(`${DATA_API_URL}/users/${userId}/parcels`);
            if (response.status === 200) {
                this.updateDatasetUtilsFile(response.data);
                console.log("Parcelas recibidas:", response.data);
            } else {
                console.error("No se pudieron obtener las parcelas:", response.statusText);
            }
        } catch (error) {
            console.error("Error al obtener las parcelas:", error);
        }
    }

    updateDatasetUtilsFile(parcels) {
        parcels.forEach(parcel => {
            datasets[parcel.catastral_ref] = {
                data: parcel.geojson_data
            };
        });

        this.setState({
            datasets: datasets
        })
    
        emitter.emit('moveDataset', this.state.datasets);
    }    

    handleLoginClick = async () => {
        this.setState({ logining: true });
        const payload = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
        };
        try {
            const response = await axios.post(`${AUTH_API_URL}/login`, payload);
            if (response.status === 200) {
                const userID = response.data.message[0];
                const token  = response.data.message[1];
                emitter.emit('handleToken', token);
                localStorage.removeItem('token');
                localStorage.removeItem('jwt');
                localStorage.setItem('token', token);
                emitter.emit('showSnackbar', 'success', 'User login successfully.');
                emitter.emit('setLoginState', true);
                this.getUserParcels(userID);
                this.setState({ open: false, logining: false, idUser: userID });
            }
        } catch (err) {
            emitter.emit('showSnackbar', 'error', 'Credenciales incorrectas.');
            this.setState({ logining: false });
        }
    }

    handleRegisterClick = async () => {
        this.setState({ logining: true });
        const payload = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
        };
        try {
            await axios.post(`${AUTH_API_URL}/register`, payload);
            emitter.emit('showSnackbar', 'success', 'Usuario registrado. Inicia sesión.');
            this.setState({ mode: 'login', logining: false });
        } catch (err) {
            const msg = (err.response && err.response.data && err.response.data.error) || 'Error al registrar.';
            emitter.emit('showSnackbar', 'error', msg);
            this.setState({ logining: false });
        }
    }


    moveDataset = () => {
        var datos = this.state.datasets
        this.setState({ movedData: datos });

    }

    componentDidMount() {
        // Bind event listener
        this.loginListener = emitter.addListener('login', () => {
            this.setState({
                open: true
            });
            
        });

        this.moveDatasetListener = emitter.addListener('moveDataset', () => {
            this.moveDataset();
        });
        
    }
    

    componentWillUnmount() {
        // Remove event listener
        emitter.removeListener(this.loginListener);
        emitter.removeListener(this.moveDatasetListener);

    }

    render() {
        return (
            <MuiThemeProvider theme={theme}>
                <Dialog open={this.state.open} TransitionComponent={Transition} onClose={this.handleLoginClose}>
                    <div style={styles.loginContainer}>
                        {this.state.mode === 'login' ?                         
                        <><Typography style={styles.title} variant="h5" gutterBottom>Inicio de Sesión</Typography><TextField
                                style={styles.inputBox}
                                variant="outlined"
                                margin="dense"
                                id="username"
                                label="Usuario" /><TextField
                                    style={styles.inputBox}
                                    variant="outlined"
                                    margin="dense"
                                    id="password"
                                    type="password"
                                    label="Contraseña" /></>
 :                       <><Typography style={styles.title} variant="h5" gutterBottom>Registro</Typography>
                            <TextField
                                style={styles.inputBox}
                                variant="outlined"
                                margin="dense"
                                id="username"
                                label="Usuario" />
                            <TextField
                                style={styles.inputBox}
                                variant="outlined"
                                margin="dense"
                                id="password"
                                type="password"
                                label="Contraseña" />

                            <Autocomplete
                            style={styles.inputBox}
                            multiple
                            onChange={this.handleChangeAutoComplete}
                            limitTags={1}
                            id="checkboxes-tags-demo"
                            options={catastralList}
                            getOptionLabel={(option) => option}
                            renderOption={(option, { selected }) => (
                                <React.Fragment>
                                <Checkbox
                                    style={{ marginRight: 1, marginLeft:1 }}
                                    checked={selected}
                                />
                                {option}
                                </React.Fragment>
                            )}
                            renderInput={(params) => (
                                <TextField id="lista" {...params} variant="outlined" label="Checkboxes" placeholder="Favorites" />
                            )}

                            renderTags={() => null} // No renderizar tags en el TextField

                            />
                             </>
}

                        <div style={styles.loginBtnContainer}>
                            <Button style={styles.loginBtn} variant="contained" color="primary" disabled={this.state.logining}
                                onClick={this.state.mode === 'login' ? this.handleLoginClick : this.handleRegisterClick}>
                                {this.state.mode === 'login' ? 'INICIAR SESIÓN' : 'REGISTRAR'}
                            </Button>
                            {this.state.logining && <CircularProgress style={styles.loginBtnProgress} size={24} />}
                            <Button style={styles.loginBtn} onClick={this.handleChangeForm} color="primary">
                            {this.state.mode === 'login' ? 'Register' : 'Login'}
                        </Button>
                        </div>
                    </div>
                </Dialog>
            </MuiThemeProvider>
        );
    }
}

export default Login;
